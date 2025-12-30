import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TokenData {
  team_member_id: string;
  expires_at: string;
  used_at: string | null;
}

interface MemberData {
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
  role: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Invalid invitation link - no token provided");
        setLoading(false);
        return;
      }

      try {
        // Validate token
        const { data: tokenResult, error: tokenError } = await supabase
          .from("member_invitation_tokens")
          .select("team_member_id, expires_at, used_at")
          .eq("token", token)
          .single();

        if (tokenError || !tokenResult) {
          setError("Invalid invitation link. Please contact your administrator for a new invitation.");
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (new Date(tokenResult.expires_at) < new Date()) {
          setError("This invitation has expired. Please contact your administrator for a new invitation.");
          setLoading(false);
          return;
        }

        // Check if token was already used
        if (tokenResult.used_at) {
          setError("This invitation has already been used. If you need help accessing your account, please contact your administrator.");
          setLoading(false);
          return;
        }

        setTokenData(tokenResult);

        // Get member info
        const { data: member, error: memberError } = await supabase
          .from("team_members")
          .select("first_name, last_name, email, company_id, role")
          .eq("id", tokenResult.team_member_id)
          .single();

        if (memberError || !member) {
          setError("Could not find your member information. Please contact your administrator.");
          setLoading(false);
          return;
        }

        setMemberData(member);
        setLoading(false);
      } catch (err) {
        console.error("Error validating invitation:", err);
        setError("An error occurred while validating your invitation.");
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberData || !tokenData || !token) return;

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create user account via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: memberData.email,
        password: password,
        options: {
          data: {
            first_name: memberData.first_name,
            last_name: memberData.last_name,
            full_name: `${memberData.first_name} ${memberData.last_name}`,
            company_id: memberData.company_id,
            role: memberData.role,
          },
        },
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already registered")) {
          toast({
            title: "Account already exists",
            description: "An account with this email already exists. Please try logging in instead.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        throw authError;
      }

      // Mark token as used
      await supabase
        .from("member_invitation_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      // Update team member status to active
      await supabase
        .from("team_members")
        .update({ status: "active" })
        .eq("id", tokenData.team_member_id);

      setSuccess(true);
      
      toast({
        title: "Account created successfully!",
        description: "You can now log in to access HSE Hub.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);

    } catch (err: any) {
      console.error("Error creating account:", err);
      toast({
        title: "Error creating account",
        description: err.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Invitation Invalid</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-700">Welcome to HSE Hub!</CardTitle>
            <CardDescription>
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Redirecting you to the login page...
            </p>
            <Button onClick={() => navigate("/auth")}>
              Go to Login Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <UserPlus className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle>Accept Your Invitation</CardTitle>
          <CardDescription>
            Welcome, {memberData?.first_name}! Set up your password to join HSE Hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{memberData?.first_name} {memberData?.last_name}</span>
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{memberData?.email}</span>
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium">{memberData?.role}</span>
            </div>
          </div>

          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div>
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account & Join
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                Log in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
