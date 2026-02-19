// ============================================================
// BookFlow — WhatsApp Incoming Message Handler
// lib/whatsapp/incoming-message-handler.ts
// Processes incoming WhatsApp messages and handles YES/NO/RESCHEDULE intents
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "./meta-client";
import { getBusinessConfig } from "@/lib/templates/utils";
import type { TemplateConfig } from "@/lib/templates/types";
import { getAvailableSlots } from "@/lib/booking/availability-checker";
// Date formatting helper (no external dependency)
function formatDate(dateStr: string, formatStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  if (formatStr === "EEEE, d MMM") {
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }
  if (formatStr === "EEE h:mm a") {
    // For time formatting, we need to parse the time from the date string or use provided time
    // This is a simplified version - in practice you'd pass time separately
    return dateStr; // Return as-is for now, will be handled by caller
  }
  return dateStr;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface IncomingMessage {
  from: string; // Phone number (e.g., "919876543210")
  text: string; // Message body
  messageId: string;
  timestamp: string;
}

export interface MessageIntent {
  type: "yes" | "no" | "reschedule" | "slot_selection" | "unknown";
  slotNumber?: number; // For slot selection (1, 2, 3)
}

/**
 * Detect intent from customer message
 */
export function detectIntent(text: string, sessionState?: string | null): MessageIntent {
  const normalized = text.trim().toLowerCase();
  
  // If awaiting slot selection, check for number (1, 2, 3)
  if (sessionState === "awaiting_slot_selection") {
    const num = parseInt(normalized);
    if (num >= 1 && num <= 3) {
      return { type: "slot_selection", slotNumber: num };
    }
  }
  
  // Check for YES
  if (/^(yes|y|ok|okay|confirm|confirmed|sure|done|✓|✅)$/i.test(normalized)) {
    return { type: "yes" };
  }
  
  // Check for NO
  if (/^(no|n|cancel|cancelled|stop|don't|dont)$/i.test(normalized)) {
    return { type: "no" };
  }
  
  // Check for RESCHEDULE
  if (/^(reschedule|change|modify|shift|move|different|another)$/i.test(normalized)) {
    return { type: "reschedule" };
  }
  
  return { type: "unknown" };
}

/**
 * Find active booking for a phone number
 */
async function findActiveBooking(phone: string, businessId?: string) {
  const supabase = getSupabase();
  
  // Normalize phone (remove +, spaces, etc.)
  const normalizedPhone = phone.replace(/\D/g, "");
  
  console.log("[whatsapp-incoming] Searching for booking with phone:", normalizedPhone, "original:", phone);
  
  // Query all active bookings and filter by normalized phone in code
  // This handles phone numbers stored with + prefix or different formats
  let query = supabase
    .from("bookings")
    .select(`
      id, status, business_id, customer_id, service_id, staff_id,
      booking_date, booking_time, duration_minutes,
      whatsapp_session_state, custom_data,
      customers!inner(phone, name),
      services(name),
      staff(users(name)),
      businesses(name, slug, address, phone)
    `)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(50); // Get recent bookings to filter by phone
  
  if (businessId) {
    query = query.eq("business_id", businessId);
  }
  
  const { data: bookings, error } = await query;
  
  if (error) {
    console.error("[whatsapp-incoming] Error finding booking:", error);
    return null;
  }
  
  if (!bookings || bookings.length === 0) {
    console.log("[whatsapp-incoming] No active bookings found");
    return null;
  }
  
  // Find booking where customer phone matches (normalized)
  const matchedBooking = bookings.find((b: any) => {
    const customerPhone = b.customers?.phone || "";
    const normalizedCustomerPhone = customerPhone.replace(/\D/g, "");
    return normalizedCustomerPhone === normalizedPhone;
  });
  
  if (!matchedBooking) {
    console.log("[whatsapp-incoming] No active booking found for phone:", normalizedPhone);
    console.log("[whatsapp-incoming] Available customer phones:", bookings.map((b: any) => ({
      phone: b.customers?.phone,
      normalized: (b.customers?.phone || "").replace(/\D/g, ""),
      bookingId: b.id
    })));
    return null;
  }
  
  console.log("[whatsapp-incoming] Found booking:", matchedBooking.id, "status:", matchedBooking.status);
  
  const booking = matchedBooking as any;
  const customer = booking.customers;
  const service = booking.services;
  const staff = booking.staff;
  const business = booking.businesses;
  
  // Priority: custom_data.customer_name (booking-specific) > customer.name (table)
  // This ensures we use the name from the actual booking, not the customer record
  const bookingCustomerName = booking.custom_data?.customer_name || customer?.name || "Customer";
  
  return {
    id: booking.id,
    status: booking.status,
    business_id: booking.business_id,
    customer_id: booking.customer_id,
    service_id: booking.service_id,
    staff_id: booking.staff_id,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    duration_minutes: booking.duration_minutes,
    whatsapp_session_state: booking.whatsapp_session_state,
    custom_data: booking.custom_data,
    customer_name: bookingCustomerName,
    customer_phone: customer?.phone || phone,
    service_name: service?.name || "Service",
    staff_name: staff?.users?.name || "Staff",
    business_name: business?.name || "Business",
    business_address: business?.address,
    business_phone: business?.phone,
    business_slug: business?.slug,
  };
}

/**
 * Handle YES intent - confirm booking
 */
async function handleYesIntent(booking: any) {
  const supabase = getSupabase();
  
  // Update booking status
  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      whatsapp_session_state: null, // Clear session state
    })
    .eq("id", booking.id);
  
  // Send confirmation message
  const config = await getBusinessConfig(booking.business_id);
  if (config) {
    await sendWhatsApp({
      businessId: booking.business_id,
      to: booking.customer_phone,
      messageType: "confirmation",
      bookingId: booking.id,
      config,
      variables: {
        customer_name: booking.customer_name,
        service_name: booking.service_name,
        staff_name: booking.staff_name,
        date: formatDate(booking.booking_date, "EEEE, d MMM"),
        time: booking.booking_time,
        business_name: booking.business_name,
        business_address: booking.business_address || "",
        booking_link: `${process.env.NEXT_PUBLIC_APP_URL || ""}/booking/${booking.id}`,
      },
    });
  }
  
  // Notify owner
  await notifyOwner(booking.business_id, {
    type: "confirmed",
    customer_name: booking.customer_name,
    service_name: booking.service_name,
    date: booking.booking_date,
    time: booking.booking_time,
  });
  
  return { success: true, message: "Booking confirmed" };
}

/**
 * Handle NO intent - cancel booking
 */
async function handleNoIntent(booking: any) {
  const supabase = getSupabase();
  
  // Update booking status
  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: "Cancelled via WhatsApp",
      whatsapp_session_state: null,
    })
    .eq("id", booking.id);
  
  // Send cancellation message
  const config = await getBusinessConfig(booking.business_id);
  if (config) {
    await sendWhatsApp({
      businessId: booking.business_id,
      to: booking.customer_phone,
      messageType: "custom",
      customMessage: `No problem ${booking.customer_name} 😊\n\nYour appointment has been cancelled.\n\nWould you like to reschedule?\nReply RESCHEDULE and we will send you available slots.`,
      config,
      variables: {},
    });
  }
  
  // Notify owner
  await notifyOwner(booking.business_id, {
    type: "cancelled",
    customer_name: booking.customer_name,
    service_name: booking.service_name,
    date: booking.booking_date,
    time: booking.booking_time,
  });
  
  // Check waitlist
  await checkAndNotifyWaitlist(booking);
  
  return { success: true, message: "Booking cancelled" };
}

/**
 * Handle RESCHEDULE intent - send available slots
 */
async function handleRescheduleIntent(booking: any) {
  const supabase = getSupabase();
  
  // Get next 3 available slots
  const today = new Date();
  const slots: Array<{ date: string; time: string; label: string }> = [];
  
  // Check next 7 days for available slots
  for (let i = 1; i <= 7 && slots.length < 3; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);
    const dateStr = checkDate.toISOString().split("T")[0];
    
    try {
      const availability = await getAvailableSlots(
        booking.business_id,
        booking.service_id,
        booking.staff_id,
        dateStr
      );
      
      for (const result of availability) {
        const allSlots = [
          ...result.slots.morning,
          ...result.slots.afternoon,
          ...result.slots.evening,
        ];
        
        for (const slot of allSlots) {
          if (slot.available && slots.length < 3) {
            slots.push({
              date: dateStr,
              time: slot.time,
              label: `${formatDate(dateStr, "EEEE, d MMM")} at ${slot.label}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("[reschedule] Error fetching slots:", error);
    }
  }
  
  if (slots.length === 0) {
    // No slots available
    const config = await getBusinessConfig(booking.business_id);
    if (config) {
      await sendWhatsApp({
        businessId: booking.business_id,
        to: booking.customer_phone,
        messageType: "custom",
        customMessage: `Sorry ${booking.customer_name}, no available slots found in the next 7 days.\n\nPlease contact us at ${booking.business_phone || "our office"} to find a suitable time.`,
        config,
        variables: {},
      });
    }
    return { success: false, message: "No slots available" };
  }
  
  // Update session state
  await supabase
    .from("bookings")
    .update({
      whatsapp_session_state: "awaiting_slot_selection",
      custom_data: {
        ...booking.custom_data,
        reschedule_options: slots,
      },
    })
    .eq("id", booking.id);
  
  // Send slot options
  const slotList = slots
    .map((s, i) => `${i + 1}️⃣ ${s.label}`)
    .join("\n");
  
  const config = await getBusinessConfig(booking.business_id);
  if (config) {
    await sendWhatsApp({
      businessId: booking.business_id,
      to: booking.customer_phone,
      messageType: "custom",
      customMessage: `Sure ${booking.customer_name}! Here are the next available slots 📅\n\n${slotList}\n\nReply 1, 2, or 3 to confirm your new appointment time.`,
      config,
      variables: {},
    });
  }
  
  return { success: true, message: "Slots sent", slots };
}

/**
 * Handle slot selection (1, 2, or 3)
 */
async function handleSlotSelection(booking: any, slotNumber: number) {
  const supabase = getSupabase();
  
  const rescheduleOptions = booking.custom_data?.reschedule_options as
    | Array<{ date: string; time: string; label: string }>
    | undefined;
  
  if (!rescheduleOptions || slotNumber < 1 || slotNumber > rescheduleOptions.length) {
    const config = await getBusinessConfig(booking.business_id);
    if (config) {
      await sendWhatsApp({
        businessId: booking.business_id,
        to: booking.customer_phone,
        messageType: "custom",
        customMessage: `Sorry, invalid selection. Please reply 1, 2, or 3.`,
        config,
        variables: {},
      });
    }
    return { success: false, message: "Invalid slot selection" };
  }
  
  const selectedSlot = rescheduleOptions[slotNumber - 1];
  
  // Update booking with new date/time
  await supabase
    .from("bookings")
    .update({
      booking_date: selectedSlot.date,
      booking_time: selectedSlot.time,
      whatsapp_session_state: null,
      custom_data: {
        ...booking.custom_data,
        reschedule_options: undefined,
        rescheduled_from: {
          date: booking.booking_date,
          time: booking.booking_time,
        },
      },
    })
    .eq("id", booking.id);
  
  // Send confirmation
  const config = await getBusinessConfig(booking.business_id);
  if (config) {
    await sendWhatsApp({
      businessId: booking.business_id,
      to: booking.customer_phone,
      messageType: "custom",
      customMessage: `✅ Done ${booking.customer_name}!\n\nYour appointment has been rescheduled to:\n\n📅 ${selectedSlot.label}\n🏢 ${booking.business_name}\n\nSee you then! 😊`,
      config,
      variables: {},
    });
  }
  
  // Notify owner
  await notifyOwner(booking.business_id, {
    type: "rescheduled",
    customer_name: booking.customer_name,
    service_name: booking.service_name,
    old_date: booking.booking_date,
    old_time: booking.booking_time,
    new_date: selectedSlot.date,
    new_time: selectedSlot.time,
  });
  
  return { success: true, message: "Booking rescheduled", slot: selectedSlot };
}

/**
 * Handle unknown intent - send help message
 */
async function handleUnknownIntent(booking: any) {
  const config = await getBusinessConfig(booking.business_id);
  if (config) {
    await sendWhatsApp({
      businessId: booking.business_id,
      to: booking.customer_phone,
      messageType: "custom",
      customMessage: `Sorry ${booking.customer_name}, I didn't understand that 😊\n\nPlease reply:\n✅ YES to confirm your appointment\n❌ NO to cancel\n🔄 RESCHEDULE to change the time`,
      config,
      variables: {},
    });
  }
  
  return { success: true, message: "Help message sent" };
}

/**
 * Check waitlist and notify customers when slots open
 */
async function checkAndNotifyWaitlist(booking: any) {
  const supabase = getSupabase();
  
  // Find active waitlist entries matching this slot
  const { data: waitlistEntries } = await supabase
    .from("waitlist")
    .select(`
      id, customer_id, service_id, staff_id,
      customers(phone, name),
      services(name)
    `)
    .eq("business_id", booking.business_id)
    .eq("status", "active")
    .or(`service_id.eq.${booking.service_id},service_id.is.null`)
    .or(`staff_id.eq.${booking.staff_id},staff_id.is.null`);
  
  if (!waitlistEntries || waitlistEntries.length === 0) return;
  
  // Check if any waitlist entry matches the cancelled slot
  for (const entry of waitlistEntries) {
    const entryData = entry as any;
    const customer = entryData.customers;
    const service = entryData.services;
    
    // Simple match: same service, same staff (or any staff)
    const matchesService = !entryData.service_id || entryData.service_id === booking.service_id;
    const matchesStaff = !entryData.staff_id || entryData.staff_id === booking.staff_id;
    
    if (matchesService && matchesStaff && customer?.phone) {
      // Notify customer
      const config = await getBusinessConfig(booking.business_id);
      if (config) {
        await sendWhatsApp({
          businessId: booking.business_id,
          to: customer.phone,
          messageType: "custom",
          customMessage: `🎉 Good news ${customer.name}!\n\nA slot just opened at ${booking.business_name}\n\n📅 ${formatDate(booking.booking_date, "EEEE, d MMM")} at ${booking.booking_time}\n💇 ${service?.name || "Service"} available\n\nReply BOOK to grab it now!\nThis slot won't last long ⏰`,
          config,
          variables: {},
        });
      }
      
      // Mark waitlist as notified
      await supabase
        .from("waitlist")
        .update({
          status: "notified",
          notified_at: new Date().toISOString(),
        })
        .eq("id", entryData.id);
    }
  }
}

/**
 * Notify business owner about booking updates
 */
async function notifyOwner(
  businessId: string,
  update: {
    type: "confirmed" | "cancelled" | "rescheduled";
    customer_name: string;
    service_name: string;
    date?: string;
    time?: string;
    old_date?: string;
    old_time?: string;
    new_date?: string;
    new_time?: string;
  }
) {
  const supabase = getSupabase();
  
  // Get business owner phone
  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id, name, phone")
    .eq("id", businessId)
    .single();
  
  if (!business?.owner_id) return;
  
  const { data: owner } = await supabase
    .from("users")
    .select("phone")
    .eq("id", business.owner_id)
    .single();
  
  if (!owner?.phone) return;
  
  const config = await getBusinessConfig(businessId);
  if (!config) return;
  
  let message = "";
  if (update.type === "confirmed") {
    message = `✅ Booking Confirmed\n\n${update.customer_name} confirmed their ${update.time} appointment for ${update.service_name}.\n\nYour schedule is locked in 🔒`;
  } else if (update.type === "cancelled") {
    message = `⚠️ Cancellation Alert\n\n${update.customer_name} cancelled their ${update.time} appointment.\n\nSlot is now OPEN.\nChecking your waitlist now... 🔄`;
  } else if (update.type === "rescheduled") {
    const oldDate = new Date(update.old_date! + "T00:00:00");
    const newDate = new Date(update.new_date! + "T00:00:00");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formatTime = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      const period = h < 12 ? "AM" : "PM";
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, "0")} ${period}`;
    };
    message = `🔄 Appointment Rescheduled\n\n${update.customer_name} moved from ${days[oldDate.getDay()]} ${formatTime(update.old_time!)} to ${days[newDate.getDay()]} ${formatTime(update.new_time!)}\n\nOld slot is now open.`;
  }
  
  await sendWhatsApp({
    businessId,
    to: owner.phone,
    messageType: "custom",
    customMessage: message,
    config,
    variables: {},
  });
}

/**
 * Main handler for incoming WhatsApp messages
 */
export async function handleIncomingMessage(message: IncomingMessage): Promise<{
  success: boolean;
  handled: boolean;
  error?: string;
}> {
  try {
    // Find active booking for this phone number
    const booking = await findActiveBooking(message.from);
    
    if (!booking) {
      // No active booking found - ignore or send generic response
      return { success: true, handled: false };
    }
    
    // Detect intent
    const intent = detectIntent(message.text, booking.whatsapp_session_state);
    
    console.log("[whatsapp-incoming] Intent detected:", {
      text: message.text,
      intent: intent.type,
      sessionState: booking.whatsapp_session_state,
    });
    
    // Handle based on intent
    switch (intent.type) {
      case "yes":
        await handleYesIntent(booking);
        return { success: true, handled: true };
      
      case "no":
        await handleNoIntent(booking);
        return { success: true, handled: true };
      
      case "reschedule":
        await handleRescheduleIntent(booking);
        return { success: true, handled: true };
      
      case "slot_selection":
        if (intent.slotNumber) {
          await handleSlotSelection(booking, intent.slotNumber);
          return { success: true, handled: true };
        }
        break;
      
      case "unknown":
        await handleUnknownIntent(booking);
        return { success: true, handled: true };
    }
    
    return { success: true, handled: false };
  } catch (error) {
    console.error("[whatsapp-incoming] Error handling message:", error);
    return {
      success: false,
      handled: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
