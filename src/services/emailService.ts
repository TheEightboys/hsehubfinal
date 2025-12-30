import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

export async function sendMemberInvitation(
    teamMemberId: string,
    email: string,
    name: string
) {
    try {
        // Generate secure token
        const token = nanoid(32);

        console.log("Attempting to store token for team member:", teamMemberId);

        // Store token in database
        const { data: insertData, error: tokenError } = await supabase
            .from("member_invitation_tokens")
            .insert({
                team_member_id: teamMemberId,
                token: token,
            })
            .select();

        if (tokenError) {
            console.error("❌ DATABASE INSERT FAILED:", {
                error: tokenError,
                message: tokenError.message,
                details: tokenError.details,
                hint: tokenError.hint,
                code: tokenError.code,
                teamMemberId: teamMemberId,
            });
            throw new Error(`Failed to store invitation token: ${tokenError.message}`);
        }

        if (!insertData || insertData.length === 0) {
            console.error("❌ DATABASE INSERT returned no data");
            throw new Error("Failed to store invitation token: No data returned");
        }

        console.log("✅ Token stored successfully:", insertData);

        // Build URL for team invitation
        const inviteUrl = `${window.location.origin}/invite/${token}`;

        console.log("Calling email edge function with URL:", inviteUrl);

        // Send email via Supabase Edge Function
        const { data, error } = await supabase.functions.invoke(
            "send-invitation-email",
            {
                body: {
                    to: email,
                    name: name,
                    inviteUrl: inviteUrl,
                },
            }
        );

        if (error) {
            console.error("❌ EDGE FUNCTION ERROR:", error);
            throw error;
        }

        if (data?.error) {
            console.error("❌ Edge Function returned error:", data.error);
            throw new Error(data.error);
        }

        console.log("✅ Invitation email sent successfully");

        return { success: true, token };
    } catch (error) {
        console.error("❌ FAILED TO SEND MEMBER INVITATION:", error);
        throw error;
    }
}

export async function sendNoteNotification(
    employeeEmail: string,
    employeeName: string,
    noteContent: string,
    fromEmployeeName: string
) {
    try {
        // Send notification email for @mentioned notes
        const { data, error } = await supabase.functions.invoke(
            "send-note-notification",
            {
                body: {
                    to: employeeEmail,
                    name: employeeName,
                    noteContent: noteContent,
                    from: fromEmployeeName,
                },
            }
        );

        if (error) {
            console.error("Error sending note notification:", error);
            console.error("Response data:", data);
            throw error;
        }

        if (data?.error) {
            console.error("Edge Function returned error:", data.error);
            throw new Error(data.error);
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to send note notification:", error);
        throw error;
    }
}
