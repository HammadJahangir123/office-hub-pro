import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateNotificationRequest {
  employeeName: string;
  employeeDepartment: string;
  employeeSection: string;
  changedBy: string;
  changedByEmail: string;
  oldData: Record<string, any>;
  newData: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      employeeName,
      employeeDepartment,
      employeeSection,
      changedBy,
      changedByEmail,
      oldData,
      newData,
    }: UpdateNotificationRequest = await req.json();

    console.log("Processing employee update notification for:", employeeName);

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get admin emails from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminRoles.map((r) => r.user_id));

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch admin emails");
    }

    const adminEmails = profiles.map((p) => p.email);
    console.log(`Sending notifications to ${adminEmails.length} admins`);

    // Calculate changes
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
    const fieldLabels: Record<string, string> = {
      name: "Name",
      username: "Username",
      email: "Email",
      department: "Department",
      section: "Section",
      computer_name: "Computer Name",
      computer_serial: "Computer Serial",
      ip_address: "IP Address",
      specs: "Specifications",
      led_model: "LED Model",
      led_serial: "LED Serial",
      printer_model: "Printer Model",
      printer_serial: "Printer Serial",
      scanner_model: "Scanner Model",
      scanner_serial: "Scanner Serial",
      keyboard: "Keyboard",
      mouse: "Mouse",
      internet_access: "Internet Access",
      usb_access: "USB Access",
      last_pm: "Last PM",
      extension_number: "Extension Number",
    };

    for (const key in newData) {
      if (
        key !== "updated_at" &&
        key !== "created_at" &&
        key !== "id" &&
        oldData[key] !== newData[key]
      ) {
        const oldVal = oldData[key] === null || oldData[key] === undefined ? "Not set" : String(oldData[key]);
        const newVal = newData[key] === null || newData[key] === undefined ? "Not set" : String(newData[key]);
        
        changes.push({
          field: fieldLabels[key] || key,
          oldValue: oldVal === "true" ? "Yes" : oldVal === "false" ? "No" : oldVal,
          newValue: newVal === "true" ? "Yes" : newVal === "false" ? "No" : newVal,
        });
      }
    }

    if (changes.length === 0) {
      console.log("No changes detected, skipping email");
      return new Response(
        JSON.stringify({ message: "No changes to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build changes HTML
    const changesHtml = changes
      .map(
        (change) => `
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 500;">${change.field}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; color: #ef4444;">${change.oldValue}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981;">${change.newValue}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          Employee Record Updated
        </h2>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Employee Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${employeeName}</p>
          <p style="margin: 5px 0;"><strong>Department:</strong> ${employeeDepartment}</p>
          <p style="margin: 5px 0;"><strong>Section:</strong> ${employeeSection}</p>
        </div>

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Updated By</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${changedBy}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${changedByEmail}</p>
        </div>

        <h3 style="color: #374151;">Changes Made</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Field</th>
              <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Old Value</th>
              <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">New Value</th>
            </tr>
          </thead>
          <tbody>
            ${changesHtml}
          </tbody>
        </table>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          This is an automated notification from the Office Support Dashboard.
        </p>
      </div>
    `;

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "Office Support Dashboard <onboarding@resend.dev>",
      to: adminEmails,
      subject: `Employee Record Updated: ${employeeName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-employee-update-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
