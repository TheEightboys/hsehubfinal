import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  GraduationCap,
  Upload,
  Trash2,
  Video,
  FileText,
  Type,
  Link,
  FileArchive,
  FolderOpen,
  Users,
} from "lucide-react";
import LessonCard from "@/components/training/LessonCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
}

interface Employee {
  id: string;
  full_name: string;
  employee_number?: string | null;
}

export default function Training() {
  const { courseId: urlCourseId } = useParams<{ courseId?: string }>();
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courseAccessByCourse, setCourseAccessByCourse] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [managingAccessCourse, setManagingAccessCourse] = useState<Course | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [savingAccess, setSavingAccess] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const courseForm = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchCourses();
      fetchEmployees();
      fetchCourseAccess();
    }
  }, [user, loading, navigate, companyId]);

  // Auto-select course from URL if provided, or clear selection if no courseId
  useEffect(() => {
    if (urlCourseId && courses.length > 0) {
      const course = courses.find(c => c.id === urlCourseId);
      if (course && selectedCourse?.id !== urlCourseId) {
        setSelectedCourse(course);
        fetchLessons(urlCourseId);
      }
    } else if (!urlCourseId && selectedCourse) {
      // Clear selection when navigating back to main course list
      setSelectedCourse(null);
      setLessons([]);
    }
  }, [urlCourseId, courses]);

  const fetchCourses = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      toast({
        title: "Error loading courses",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (err: any) {
      toast({
        title: "Error loading lessons",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, employee_number")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (err: any) {
      toast({
        title: "Error loading employees",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const fetchCourseAccess = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("course_employee_access")
        .select("course_id, employee_id")
        .eq("company_id", companyId);

      if (error) throw error;

      const mapped: Record<string, string[]> = {};
      (data || []).forEach((row: any) => {
        if (!mapped[row.course_id]) mapped[row.course_id] = [];
        mapped[row.course_id].push(row.employee_id);
      });

      setCourseAccessByCourse(mapped);
    } catch (err: any) {
      toast({
        title: "Error loading course access",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const openAccessDialog = (course: Course) => {
    setManagingAccessCourse(course);
    setSelectedEmployeeIds(new Set(courseAccessByCourse[course.id] || []));
    setIsAccessDialogOpen(true);
  };

  const toggleEmployeeAccess = (employeeId: string, checked: boolean) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(employeeId);
      } else {
        next.delete(employeeId);
      }
      return next;
    });
  };

  const saveCourseAccess = async () => {
    if (!companyId || !managingAccessCourse) return;

    setSavingAccess(true);
    try {
      const { error: deleteError } = await (supabase as any)
        .from("course_employee_access")
        .delete()
        .eq("course_id", managingAccessCourse.id)
        .eq("company_id", companyId);

      if (deleteError) throw deleteError;

      const employeeIds = Array.from(selectedEmployeeIds);
      if (employeeIds.length > 0) {
        const rows = employeeIds.map((employeeId) => ({
          company_id: companyId,
          course_id: managingAccessCourse.id,
          employee_id: employeeId,
          assigned_by: user?.id || null,
        }));

        const { error: insertError } = await (supabase as any)
          .from("course_employee_access")
          .insert(rows);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Course access updated successfully",
      });

      setIsAccessDialogOpen(false);
      setManagingAccessCourse(null);
      setSelectedEmployeeIds(new Set());
      fetchCourseAccess();
    } catch (err: any) {
      toast({
        title: "Error updating access",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingAccess(false);
    }
  };

  const onCourseSubmit = async (data: CourseFormData) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("courses").insert([
        {
          company_id: companyId,
          name: data.name,
          description: data.description || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course created successfully",
      });
      setIsCourseDialogOpen(false);
      courseForm.reset();
      fetchCourses();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const onCourseDelete = async (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the course when clicking delete

    if (!confirm(`Are you sure you want to delete "${courseName}"? This will also delete all lessons in this course.`)) {
      return;
    }

    try {
      // First delete all lessons in the course
      const { error: lessonsError } = await supabase
        .from("course_lessons")
        .delete()
        .eq("course_id", courseId);

      if (lessonsError) throw lessonsError;

      // Then delete the course
      const { error: courseError } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (courseError) throw courseError;

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
      fetchCourses();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    const lessonToDuplicate = lessons.find((l) => l.id === lessonId);
    if (!lessonToDuplicate || !selectedCourse) return;

    try {
      const { error } = await supabase.from("course_lessons").insert([
        {
          course_id: selectedCourse.id,
          name: `${lessonToDuplicate.name} (Copy)`,
          type: lessonToDuplicate.type,
          content_url: lessonToDuplicate.content_url,
          content_data: lessonToDuplicate.content_data,
          order_index: lessons.length,
          status: "draft",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lesson duplicated successfully",
      });
      fetchLessons(selectedCourse.id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleLessonStatus = async (lessonId: string, currentStatus: string) => {
    const newStatus = currentStatus === "draft" ? "published" : "draft";

    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({ status: newStatus })
        .eq("id", lessonId);

      if (error) throw error;

      setLessons(lessons.map((l) => (l.id === lessonId ? { ...l, status: newStatus as "draft" | "published" } : l)));
      toast({
        title: "Success",
        description: `Lesson ${newStatus === "published" ? "published" : "set as draft"} successfully`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const onLessonDelete = async (lessonId: string, lessonName: string) => {
    if (!confirm(`Are you sure you want to delete "${lessonName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      setLessons(lessons.filter((l) => l.id !== lessonId));
      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio":
        return <Video className="w-4 h-4" />;
      case "pdf":
        return <FileText className="w-4 h-4" />;
      case "text":
        return <Type className="w-4 h-4" />;
      case "website_link":
        return <Link className="w-4 h-4" />;
      case "zip_file":
        return <FileArchive className="w-4 h-4" />;
      case "subchapter":
        return <FolderOpen className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video_audio":
        return "Video/Audio";
      case "pdf":
        return "PDF";
      case "text":
        return "Text";
      case "website_link":
        return "Website Link";
      case "zip_file":
        return "ZIP File";
      case "subchapter":
        return "Subchapter";
      default:
        return type;
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAccessDialog = () => (
    <Dialog
      open={isAccessDialogOpen}
      onOpenChange={(open) => {
        setIsAccessDialogOpen(open);
        if (!open) {
          setManagingAccessCourse(null);
          setSelectedEmployeeIds(new Set());
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Manage Employee Access
          </DialogTitle>
          <DialogDescription>
            {managingAccessCourse
              ? `Grant or remove access for ${managingAccessCourse.name}.`
              : "Grant or remove employee course access."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] overflow-y-auto border rounded-md p-3 space-y-2">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active employees found.</p>
          ) : (
            employees.map((employee) => {
              const checked = selectedEmployeeIds.has(employee.id);
              return (
                <label
                  key={employee.id}
                  className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium">{employee.full_name}</p>
                    {employee.employee_number && (
                      <p className="text-xs text-muted-foreground">
                        Employee No: {employee.employee_number}
                      </p>
                    )}
                  </div>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleEmployeeAccess(employee.id, Boolean(value))
                    }
                  />
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsAccessDialogOpen(false);
              setManagingAccessCourse(null);
              setSelectedEmployeeIds(new Set());
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={saveCourseAccess} disabled={savingAccess}>
            {savingAccess ? "Saving..." : "Save Access"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Course detail view
  if (selectedCourse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/training")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{selectedCourse.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedCourse.description || t("training.courseDescription")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{t("training.courseContent")}</CardTitle>
                  <CardDescription>
                    {t("training.manageLessons")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openAccessDialog(selectedCourse)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Access
                  </Button>
                  <Button onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("training.addLesson")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <GraduationCap className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-1">
                    {t("training.noLessons")}
                  </p>
                  <p className="text-sm text-muted-foreground/60">
                    {t("training.noLessonsDesc")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      onDelete={onLessonDelete}
                      onDuplicate={handleDuplicateLesson}
                      onToggleStatus={handleToggleLessonStatus}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {renderAccessDialog()}
        </main>
      </div>
    );
  }

  // Course list view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("training.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("training.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t("training.records")}</CardTitle>
                  <CardDescription>
                    {t("training.subtitle")}
                  </CardDescription>
                </div>
              </div>
              <Dialog
                open={isCourseDialogOpen}
                onOpenChange={setIsCourseDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("training.assign")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("training.createCourse")}</DialogTitle>
                  </DialogHeader>
                  <Form {...courseForm}>
                    <form
                      onSubmit={courseForm.handleSubmit(onCourseSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={courseForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("training.courseName")} *</FormLabel>
                            <FormControl>
                              <Input placeholder={t("training.courseName")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={courseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("training.courseDescription")} ({t("common.optional")})</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("training.courseDescription")}
                                {...field}
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCourseDialogOpen(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit">{t("training.createCourse")}</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("training.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="w-16 h-16 text-muted-foreground/20 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-1">
                  {t("training.noCourses")}
                </p>
                <p className="text-sm text-muted-foreground/60">
                  {t("training.noCoursesDesc")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="p-6 rounded-lg border-2 border-border hover:border-primary transition-all group"
                  >
                    {/* Course Card Content */}
                    <div
                      onClick={() => navigate(`/training/${course.id}`)}
                      className="cursor-pointer"
                    >
                      <div className="w-full h-24 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <GraduationCap className="w-12 h-12 text-white" />
                      </div>
                    </div>

                    {/* Course Name and Delete Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <h3
                          className="font-semibold text-lg mb-2 cursor-pointer"
                          onClick={() => navigate(`/training/${course.id}`)}
                        >
                          {course.name}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {courseAccessByCourse[course.id]?.length || 0} employees with access
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAccessDialog(course);
                          }}
                          className="p-2 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary transition-all flex-shrink-0"
                          title="Manage employee access"
                        >
                          <Users className="w-5 h-5" />
                        </button>

                        {/* Delete Button - Always Visible */}
                        <button
                          onClick={(e) => onCourseDelete(course.id, course.name, e)}
                          className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all flex-shrink-0"
                          title="Delete course"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {renderAccessDialog()}
      </main>
    </div>
  );
}
