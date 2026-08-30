// Supabase Edge Function: send-order-email
import { createClient } from "npm:@supabase/supabase-js@2";

// Ambient declarations for editor compatibility (VS Code / Antigravity IDE)
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
}

interface RawItem {
  name?: string;
  title?: string;
  quantity?: number;
  unit_price?: number;
  price?: number;
  total?: number;
  lineTotal?: number;
}

interface OrderRecord {
  id: string;
  customer_email?: string;
  customer_name?: string;
  total_amount?: number;
  currency?: string;
  items?: OrderItem[];
  // Compatibility with store schema
  subtotal?: number;
  lines?: RawItem[];
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    fulfillment?: string;
    targetDate?: string;
    payment_method?: string;
  };
  created_at?: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: OrderRecord;
  old_record: OrderRecord | null;
}

// Normalized order representation for clean template rendering
interface NormalizedOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  currency: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

function normalizeOrder(record: OrderRecord): NormalizedOrder {
  const customerName =
    record.customer_name ||
    record.customer?.name ||
    "Valued Customer";

  const customerEmail =
    record.customer_email ||
    record.customer?.email ||
    "";

  const currency = (record.currency || "INR").toUpperCase();
  const totalAmount = Number(record.total_amount ?? record.subtotal ?? 0);

  const rawItems: RawItem[] = record.items || record.lines || [];
  const items = rawItems.map((item: RawItem) => {
    const name = item.name || item.title || "Product";
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unit_price ?? item.price ?? 0);
    const total = Number(item.total ?? item.lineTotal ?? unitPrice * quantity);
    return { name, quantity, unitPrice, total };
  });

  return {
    id: String(record.id || ""),
    customerName,
    customerEmail,
    customerPhone: record.customer?.phone,
    customerAddress: record.customer?.address,
    currency,
    totalAmount,
    items,
  };
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderOrderEmailHtml(order: NormalizedOrder): string {
  const currencySymbol =
    order.currency === "INR" ? "₹" : order.currency === "USD" ? "$" : `${order.currency} `;

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 14px 12px; border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px; vertical-align: middle;">
          <div style="font-weight: 600; color: #1a202c;">${escapeHtml(item.name)}</div>
          <div style="color: #718096; font-size: 12px; margin-top: 2px;">Qty: ${item.quantity} &times; ${currencySymbol}${item.unitPrice.toFixed(2)}</div>
        </td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px; text-align: right; font-weight: 600; vertical-align: middle;">
          ${currencySymbol}${item.total.toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${escapeHtml(order.id)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); padding: 36px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">MAAHI PRODUCTS</h1>
              <p style="color: #d8f3dc; margin: 8px 0 0 0; font-size: 15px; font-weight: 400;">Thank you for your order!</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #2d3748;">
                Hi <strong>${escapeHtml(order.customerName)}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #4a5568;">
                We have received your order and our dispatch team is currently reviewing the specifications. Below is your complete summary:
              </p>
              
              <!-- Order Reference Box -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Order ID</div>
                    <div style="font-size: 15px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; color: #1b4332; font-weight: 700; margin-top: 4px;">#${escapeHtml(order.id)}</div>
                    ${
                      order.customerAddress
                        ? `<div style="font-size: 13px; color: #4a5568; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;"><strong>Delivery Location:</strong> ${escapeHtml(order.customerAddress)}</div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <!-- Order Summary Header -->
              <h3 style="margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #2d6a4f; font-weight: 700;">Order Summary</h3>

              <!-- Items Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f7fafc;">
                    <th align="left" style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; color: #718096; font-size: 12px; text-transform: uppercase; font-weight: 600;">Item</th>
                    <th align="right" style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; color: #718096; font-size: 12px; text-transform: uppercase; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #a0aec0;">No items listed</td></tr>'}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 18px 12px 0; color: #1a202c; font-size: 16px; font-weight: 700;">Grand Total</td>
                    <td style="padding: 18px 12px 0; color: #1b4332; font-size: 20px; font-weight: 800; text-align: right;">
                      ${currencySymbol}${order.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #065f46;">
                  <strong>Need help or changes?</strong> Reply directly to this email or reach us at <a href="mailto:Maahienterprises6468@gmail.com" style="color: #047857; font-weight: 600; text-decoration: underline;">Maahienterprises6468@gmail.com</a>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #edf2f7;">
              <p style="margin: 0; font-size: 12px; color: #718096; line-height: 18px;">
                &copy; ${new Date().getFullYear()} MAAHI PRODUCTS &middot; Premium Agricultural Substrates &amp; Growing Media.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const jsonResponse = (data: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    // 1. Webhook Secret Verification
    const incomingSecret = req.headers.get("x-webhook-secret");
    const configuredSecret = Deno.env.get("WEBHOOK_SECRET");

    if (configuredSecret && incomingSecret !== configuredSecret) {
      console.warn("⚠️ Unauthorized webhook trigger: secret mismatch or missing");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Validate Environment Variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "MAAHI PRODUCTS <orders@maahiproducts.com>";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing environment variables: RESEND_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "Server environment misconfigured" }, 500);
    }

    // 3. Parse and Validate Webhook Payload
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "orders" || !payload.record) {
      console.info("ℹ️ Skipping event:", { type: payload.type, table: payload.table });
      return jsonResponse({ message: "Ignored: Only INSERT on 'orders' table is processed" }, 200);
    }

    const normalized = normalizeOrder(payload.record);

    if (!normalized.id) {
      return jsonResponse({ error: "Missing order id" }, 400);
    }

    if (!normalized.customerEmail || !normalized.customerEmail.includes("@")) {
      console.warn(`⚠️ Order #${normalized.id} has no valid customer email: "${normalized.customerEmail}"`);
      return jsonResponse({ error: "Missing or invalid customer email" }, 400);
    }

    // 4. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Idempotency Check: Verify if email notification already recorded
    const { data: existingNotification, error: checkError } = await supabaseAdmin
      .from("order_notifications")
      .select("id, status")
      .eq("order_id", normalized.id)
      .eq("email_type", "order_confirmation")
      .maybeSingle();

    if (checkError) {
      console.error("Database query error during idempotency check:", checkError);
      return jsonResponse({ error: "Failed to verify notification state" }, 500);
    }

    if (existingNotification && existingNotification.status === "SENT") {
      console.info(`ℹ️ Order #${normalized.id} confirmation was already sent. Skipping.`);
      return jsonResponse({ message: "Already processed" }, 200);
    }

    // 6. Deliver Email via Resend API
    const emailHtml = renderOrderEmailHtml(normalized);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [normalized.customerEmail],
        subject: `Order Confirmation #${normalized.id} - MAAHI PRODUCTS`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("❌ Resend API Error:", resendData);

      // Audit FAILED attempt
      await supabaseAdmin.from("order_notifications").upsert(
        {
          order_id: normalized.id,
          email_type: "order_confirmation",
          recipient_email: normalized.customerEmail,
          status: "FAILED",
          error_message: JSON.stringify(resendData),
          sent_at: new Date().toISOString(),
        },
        { onConflict: "order_id, email_type" }
      );

      return jsonResponse({ error: "Failed to send email via Resend", details: resendData }, 502);
    }

    // 7. Track successful delivery in order_notifications
    const { error: insertAuditError } = await supabaseAdmin
      .from("order_notifications")
      .upsert(
        {
          order_id: normalized.id,
          email_type: "order_confirmation",
          recipient_email: normalized.customerEmail,
          status: "SENT",
          resend_id: resendData.id,
          error_message: null,
          sent_at: new Date().toISOString(),
        },
        { onConflict: "order_id, email_type" }
      );

    if (insertAuditError) {
      console.warn("⚠️ Failed to write audit record:", insertAuditError);
    }

    console.info(`✅ Order confirmation email delivered for Order #${normalized.id}, Resend ID: ${resendData.id}`);
    return jsonResponse({ success: true, email_id: resendData.id }, 200);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("💥 Unhandled Edge Function Exception:", errorMsg);
    return jsonResponse({ error: "Internal Server Error", message: errorMsg }, 500);
  }
});
