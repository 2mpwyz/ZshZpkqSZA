export type HospitalityEventStatus = "draft" | "published" | "cancelled" | "completed";
export type HospitalityEventBookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type HospitalityEventPaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export interface HospitalityEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location: string;
  price: number;
  currency: string;
  capacity: number;
  attendees_count: number;
  category: string | null;
  image_url: string | null;
  featured: boolean;
  rating: number;
  host_name: string | null;
  status: HospitalityEventStatus;
  organizer_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HospitalityEventBooking {
  id: string;
  event_id: string;
  order_number: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string | null;
  special_requests: string | null;
  quantity: number;
  subtotal: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: HospitalityEventBookingStatus;
  payment_status: HospitalityEventPaymentStatus;
  confirmation_number: string;
  ticket_code: string | null;
  created_at: string;
  updated_at: string;
  event?: HospitalityEvent;
}

export interface HospitalityEventPlan {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  location: string;
  expected_guests: number;
  description: string | null;
  is_private: boolean;
  status: "draft" | "submitted" | "approved" | "cancelled";
  created_at: string;
  updated_at: string;
}

export const formatEventDate = (startsAt: string, timezone: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(startsAt));
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(startsAt));
  }
};

export const formatEventDay = (startsAt: string, timezone: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeZone: timezone,
    }).format(new Date(startsAt));
  } catch {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(startsAt));
  }
};
