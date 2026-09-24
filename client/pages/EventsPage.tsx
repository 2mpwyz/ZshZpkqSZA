import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Star,
  Award,
  CreditCard,
  Search,
  Filter,
  Plus,
  Share2,
  Heart,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import EventCheckoutModal from "../components/events/EventCheckoutModal";
import { supabase } from "../lib/supabase";
import {
  formatEventDate,
  formatEventDay,
  type SpecialEvent,
  type SpecialEventBooking,
  type SpecialEventPlan,
} from "../lib/events";

type EventPlanForm = {
  title: string;
  eventDate: string;
  location: string;
  expectedGuests: string;
  description: string;
  isPrivate: boolean;
};

const initialPlan: EventPlanForm = {
  title: "",
  eventDate: "",
  location: "",
  expectedGuests: "",
  description: "",
  isPrivate: false,
};

type EventForm = {
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string;
  price: string;
  currency: string;
  capacity: string;
  hostName: string;
  featured: boolean;
};

const initialEventForm: EventForm = {
  title: "",
  description: "",
  category: "Fine Dining",
  startsAt: "",
  endsAt: "",
  timezone: "Africa/Kampala",
  location: "",
  price: "",
  currency: "UGX",
  capacity: "",
  hostName: "",
  featured: false,
};

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventCart, setEventCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [bookings, setBookings] = useState<SpecialEventBooking[]>([]);
  const [plans, setPlans] = useState<SpecialEventPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [planForm, setPlanForm] = useState<EventPlanForm>(initialPlan);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(initialEventForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const loadUserData = async (userId: string | null) => {
    if (!userId) {
      setIsSignedIn(false);
      setFavoriteIds(new Set());
      setBookings([]);
      setPlans([]);
      setProfileRole(null);
      return;
    }

    setIsSignedIn(true);
    const [profileResult, favoritesResult, bookingsResult, plansResult] = await Promise.all([
      supabase.from("user_profiles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("special_event_favorites").select("event_id").eq("user_id", userId),
      supabase.from("special_event_bookings").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("special_event_plans").select("*").eq("user_id", userId).order("event_date", { ascending: true }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (favoritesResult.error) throw favoritesResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (plansResult.error) throw plansResult.error;

    setProfileRole(profileResult.data?.role || null);
    setFavoriteIds(new Set((favoritesResult.data || []).map((favorite) => favorite.event_id)));
    setBookings((bookingsResult.data || []) as SpecialEventBooking[]);
    setPlans((plansResult.data || []) as SpecialEventPlan[]);
  };

  const loadEvents = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [{ data: eventRows, error: eventsError }, { data: authData }] = await Promise.all([
        supabase
          .from("special_events")
          .select("*")
          .eq("status", "published")
          .gte("starts_at", new Date().toISOString())
          .order("featured", { ascending: false })
          .order("starts_at", { ascending: true }),
        supabase.auth.getUser(),
      ]);
      if (eventsError) throw eventsError;
      await loadUserData(authData.user?.id || null);
      setEvents((eventRows || []) as SpecialEvent[]);
    } catch (error) {
      console.error("Unable to load special events", error);
      setErrorMessage("Events are not available right now. Please try again shortly.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadUserData(session?.user?.id || null).catch((error) => {
        console.error("Unable to refresh event account data", error);
      });
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const eventCategories = useMemo(() => {
    const categories = events.map((event) => event.category).filter((category): category is string => Boolean(category));
    return ["All", ...Array.from(new Set(categories))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !query || [event.title, event.description, event.location, event.host_name, event.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
      const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, searchTerm, selectedCategory]);

  const featuredEvents = filteredEvents.filter((event) => event.featured);
  const getEvent = (eventId: string) => events.find((event) => event.id === eventId);
  const getTotalEventItems = () => Object.values(eventCart).reduce((total, count) => total + count, 0);

  const canManageEvents = profileRole === "manager" || profileRole === "admin";

  const requireAuth = () => {
    if (isSignedIn) return true;
    navigate(`/login?returnTo=${encodeURIComponent("/events")}`);
    return false;
  };

  const addToEventCart = (eventId: string) => {
    const event = getEvent(eventId);
    if (!event) return;
    const existingEventIds = Object.keys(eventCart).filter((id) => id !== eventId);
    if (existingEventIds.length) {
      setNotice("Book one event at a time so each payment and ticket remains unambiguous.");
      return;
    }
    const currentQuantity = eventCart[eventId] || 0;
    if (currentQuantity + event.attendees_count >= event.capacity) {
      setNotice("This event has no more tickets available.");
      return;
    }
    setNotice("");
    setEventCart((previous) => ({ ...previous, [eventId]: currentQuantity + 1 }));
  };

  const updateEventCart = (eventId: string, quantity: number) => {
    const event = getEvent(eventId);
    if (!event) return;
    if (quantity <= 0) {
      setEventCart((previous) => {
        const next = { ...previous };
        delete next[eventId];
        return next;
      });
      return;
    }
    const existingEventIds = Object.keys(eventCart).filter((id) => id !== eventId);
    if (existingEventIds.length) {
      setNotice("Book one event at a time so each payment and ticket remains unambiguous.");
      return;
    }
    if (event.attendees_count + quantity > event.capacity) {
      setNotice("The selected quantity exceeds the remaining capacity.");
      return;
    }
    setEventCart((previous) => ({ ...previous, [eventId]: quantity }));
  };

  const removeFromEventCart = (eventId: string) => {
    setEventCart((previous) => {
      const next = { ...previous };
      delete next[eventId];
      return next;
    });
  };

  const clearEventCart = () => setEventCart({});

  const toggleFavorite = async (eventId: string) => {
    if (!requireAuth()) return;
    setNotice("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const isFavorite = favoriteIds.has(eventId);
    const result = isFavorite
      ? await supabase.from("special_event_favorites").delete().eq("user_id", authData.user.id).eq("event_id", eventId)
      : await supabase.from("special_event_favorites").insert({ user_id: authData.user.id, event_id: eventId });
    if (result.error) {
      setNotice("We could not update your saved events.");
      return;
    }
    setFavoriteIds((previous) => {
      const next = new Set(previous);
      if (isFavorite) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const submitPlan = async () => {
    if (!requireAuth()) return;
    if (!planForm.title.trim() || !planForm.eventDate || !planForm.location.trim() || !planForm.expectedGuests) {
      setNotice("Complete the event title, date, location, and expected guests.");
      return;
    }
    setIsSavingPlan(true);
    setNotice("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const planValues = {
        title: planForm.title.trim(),
        event_date: planForm.eventDate,
        location: planForm.location.trim(),
        expected_guests: Number(planForm.expectedGuests),
        description: planForm.description.trim() || null,
        is_private: planForm.isPrivate,
        status: "submitted" as const,
      };
      const result = editingPlanId
        ? await supabase.from("special_event_plans").update(planValues).eq("id", editingPlanId).eq("user_id", authData.user.id)
        : await supabase.from("special_event_plans").insert({ user_id: authData.user.id, ...planValues });
      if (result.error) throw result.error;
      setEditingPlanId(null);
      setPlanForm(initialPlan);
      setNotice("Your event proposal has been submitted.");
      await loadUserData(authData.user.id);
      setActiveTab("my-events");
    } catch (error) {
      console.error("Unable to create event proposal", error);
      setNotice("We could not submit your event proposal.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const saveManagedEvent = async () => {
    if (!requireAuth() || !canManageEvents) return;
    if (!eventForm.title.trim() || !eventForm.startsAt || !eventForm.endsAt || !eventForm.location.trim() || !eventForm.price || !eventForm.capacity) {
      setNotice("Complete the event title, dates, location, price, and capacity.");
      return;
    }
    setIsSavingPlan(true);
    setNotice("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const values = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        category: eventForm.category.trim() || null,
        starts_at: new Date(eventForm.startsAt).toISOString(),
        ends_at: new Date(eventForm.endsAt).toISOString(),
        timezone: eventForm.timezone.trim() || "UTC",
        location: eventForm.location.trim(),
        price: Number(eventForm.price),
        currency: eventForm.currency.trim().toUpperCase(),
        capacity: Number(eventForm.capacity),
        host_name: eventForm.hostName.trim() || null,
        featured: eventForm.featured,
        status: "published" as const,
        organizer_id: authData.user.id,
        created_by: authData.user.id,
      };
      const result = editingEventId
        ? await supabase.from("special_events").update(values).eq("id", editingEventId).eq("created_by", authData.user.id)
        : await supabase.from("special_events").insert(values);
      if (result.error) throw result.error;
      setEventForm(initialEventForm);
      setEditingEventId(null);
      setNotice("The event is now published.");
      await loadEvents();
    } catch (error) {
      console.error("Unable to save special event", error);
      setNotice("We could not save the published event.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const editManagedEvent = (event: SpecialEvent) => {
    setEditingEventId(event.id);
    const toInput = (value: string) => new Date(value).toISOString().slice(0, 16);
    setEventForm({ title: event.title, description: event.description || "", category: event.category || "Fine Dining", startsAt: toInput(event.starts_at), endsAt: toInput(event.ends_at), timezone: event.timezone, location: event.location, price: String(event.price), currency: event.currency, capacity: String(event.capacity), hostName: event.host_name || "", featured: event.featured });
    setActiveTab("planning");
  };

  const deleteManagedEvent = async (eventId: string) => {
    if (!requireAuth() || !canManageEvents) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { error } = await supabase.from("special_events").update({ status: "cancelled" }).eq("id", eventId).eq("created_by", authData.user.id);
    if (error) setNotice("We could not cancel that event.");
    else await loadEvents();
  };

  const editPlan = (plan: SpecialEventPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({ title: plan.title, eventDate: plan.event_date, location: plan.location, expectedGuests: String(plan.expected_guests), description: plan.description || "", isPrivate: plan.is_private });
    setActiveTab("planning");
  };

  const deletePlan = async (planId: string) => {
    if (!requireAuth()) return;
    const { error } = await supabase.from("special_event_plans").delete().eq("id", planId);
    if (error) setNotice("We could not delete that event proposal.");
    else {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) await loadUserData(authData.user.id);
    }
  };

  const handleBooked = async () => {
    clearEventCart();
    setShowCheckout(false);
    setActiveTab("my-events");
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) await loadUserData(authData.user.id);
    await loadEvents();
  };

  const renderEventCard = (event: SpecialEvent, featured = false) => {
    const isFavorite = favoriteIds.has(event.id);
    const remaining = Math.max(event.capacity - event.attendees_count, 0);
    return (
      <div key={event.id} className={featured ? "relative bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow" : "bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"}>
        {featured && <div className="absolute top-4 right-4 z-10"><Badge className="bg-sheraton-gold text-sheraton-navy">Featured</Badge></div>}
        {featured && <div className="h-48 bg-gradient-to-br from-sheraton-cream to-sheraton-pearl flex items-center justify-center"><Award className="h-16 w-16 text-sheraton-gold" /></div>}
        <div className={featured ? "p-6" : "p-0"}>
          {featured ? (
            <div className="flex items-center gap-2 mb-2"><Star className="h-4 w-4 text-yellow-500 fill-current" /><span className="text-sm text-gray-600">{event.rating.toFixed(1)}</span><span className="text-sm text-gray-400">• {event.host_name || "Sheraton"}</span></div>
          ) : <Badge variant="outline" className="mb-2">{event.category || "Experience"}</Badge>}
          <h4 className="font-semibold text-sheraton-navy mb-2">{event.title}</h4>
          {featured && <p className="text-gray-600 text-sm mb-3">{event.description}</p>}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600"><Calendar className="h-4 w-4 mr-2" />{formatEventDate(event.starts_at, event.timezone)}</div>
            <div className="flex items-center text-sm text-gray-600"><MapPin className="h-4 w-4 mr-2" />{event.location}</div>
            {featured && <div className="flex items-center text-sm text-gray-600"><Users className="h-4 w-4 mr-2" />{event.attendees_count}/{event.capacity} attending</div>}
          </div>
          <div className="flex items-center justify-between">
            <span className={featured ? "text-lg font-semibold text-sheraton-navy" : "font-semibold text-sheraton-navy"}>{formatMoney(event.price, event.currency)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void toggleFavorite(event.id)} aria-label={isFavorite ? "Remove saved event" : "Save event"}><Heart className={`h-4 w-4 ${isFavorite ? "fill-sheraton-gold text-sheraton-gold" : ""}`} /></Button>
              <Button variant={featured ? "default" : "outline"} size="sm" className={featured ? "bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy" : ""} onClick={() => { setSelectedEvent(event.id); if (featured) addToEventCart(event.id); }}>{featured ? "Book Now" : "Details"}</Button>
            </div>
          </div>
          {featured && remaining > 0 && remaining <= 5 && <p className="mt-3 text-xs text-amber-700">Only {remaining} places remaining</p>}
        </div>
      </div>
    );
  };

  const renderBrowseEvents = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search events..." className="pl-10" /></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setSearchTerm(""); setSelectedCategory("All"); }}><Filter className="h-4 w-4 mr-2" />Filter</Button><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="px-3 py-2 border rounded-md">{eventCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
      </div>
      {notice && <p role="status" className="rounded-md bg-sheraton-gold/20 p-3 text-sm text-sheraton-navy">{notice}</p>}
      {isLoading && <div className="rounded-lg bg-white p-10 text-center text-gray-600">Loading events...</div>}
      {!isLoading && errorMessage && <div className="rounded-lg bg-white p-10 text-center text-red-700">{errorMessage}</div>}
      {!isLoading && !errorMessage && !filteredEvents.length && <div className="rounded-lg bg-white p-10 text-center text-gray-600">No upcoming events match your search.</div>}
      {!isLoading && !errorMessage && featuredEvents.length > 0 && <div className="mb-8"><h3 className="text-xl font-semibold mb-4 text-sheraton-navy">Featured Events</h3><div className="grid md:grid-cols-2 gap-6">{featuredEvents.map((event) => renderEventCard(event, true))}</div></div>}
      {!isLoading && !errorMessage && filteredEvents.length > 0 && <div><h3 className="text-xl font-semibold mb-4 text-sheraton-navy">All Events</h3><div className="grid md:grid-cols-3 gap-4">{filteredEvents.map((event) => renderEventCard(event))}</div></div>}
      {selectedEvent && getEvent(selectedEvent) && <div className="bg-white rounded-lg shadow-md p-6"><div className="flex items-start justify-between gap-4"><div><Badge variant="outline" className="mb-2">{getEvent(selectedEvent)?.category || "Experience"}</Badge><h3 className="text-xl font-semibold text-sheraton-navy">{getEvent(selectedEvent)?.title}</h3><p className="mt-2 text-gray-600">{getEvent(selectedEvent)?.description}</p></div><Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button></div><div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600"><span><Calendar className="inline h-4 w-4 mr-1" />{formatEventDate(getEvent(selectedEvent)!.starts_at, getEvent(selectedEvent)!.timezone)}</span><span><MapPin className="inline h-4 w-4 mr-1" />{getEvent(selectedEvent)?.location}</span><span><Users className="inline h-4 w-4 mr-1" />{Math.max(getEvent(selectedEvent)!.capacity - getEvent(selectedEvent)!.attendees_count, 0)} places remaining</span></div><Button className="mt-5 bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy" onClick={() => addToEventCart(selectedEvent)}>Book Now</Button></div>}
    </div>
  );

  const renderMyEvents = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-sheraton-navy">My Events</h3><Button onClick={() => setActiveTab("planning")} className="bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy"><Plus className="h-4 w-4 mr-2" />Create Event</Button></div>
      {!isSignedIn && <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">Sign in to view bookings, saved events, and event proposals.</div>}
      {isSignedIn && !bookings.length && !plans.length && <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">Your booked events and proposals will appear here.</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {bookings.map((booking) => {
          const event = getEvent(booking.event_id);
          return <div key={booking.id} className="bg-white rounded-lg shadow-md p-6"><div className="flex items-center justify-between mb-4"><h4 className="font-semibold text-sheraton-navy">{event?.title || `Event booking ${booking.order_number}`}</h4><Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>{booking.status}</Badge></div><div className="flex items-center text-sm text-gray-600 mb-2"><Calendar className="h-4 w-4 mr-2" />{event ? formatEventDay(event.starts_at, event.timezone) : "Date pending"}</div><p className="text-sm text-gray-600 mb-4">{booking.quantity} ticket{booking.quantity === 1 ? "" : "s"} • {booking.payment_status}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setActiveTab("browse")}>View Event</Button><Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(booking.confirmation_number)}><Share2 className="h-4 w-4" /></Button></div></div>;
        })}
        {plans.map((plan) => <div key={plan.id} className="bg-white rounded-lg shadow-md p-6"><div className="flex items-center justify-between mb-4"><h4 className="font-semibold text-sheraton-navy">{plan.title}</h4><Badge variant="secondary">{plan.status}</Badge></div><div className="flex items-center text-sm text-gray-600 mb-2"><Calendar className="h-4 w-4 mr-2" />{plan.event_date}</div><p className="text-sm text-gray-600 mb-4">{plan.location} • {plan.expected_guests} expected guests</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => editPlan(plan)}>Edit plan</Button><Button variant="outline" size="sm" onClick={() => void deletePlan(plan.id)}>Delete</Button></div></div>)}
      </div>
    </div>
  );

  const planningTools = [
    { title: "Budget Calculator", description: "Plan your event budget with our interactive tool", icon: CreditCard, action: "Calculate" },
    { title: "Vendor Directory", description: "Find trusted local vendors and service providers", icon: Users, action: "Browse" },
    { title: "Timeline Planner", description: "Create detailed event timelines and schedules", icon: Clock, action: "Plan" },
    { title: "Guest Manager", description: "Manage invitations and RSVPs efficiently", icon: Users, action: "Manage" },
  ];

  const renderPlanning = () => (
    <div className="space-y-6">
      <div className="text-center mb-8"><h3 className="text-2xl font-semibold text-sheraton-navy mb-2">Event Planning Tools</h3><p className="text-gray-600">Professional tools to help you plan the perfect event</p></div>
      <div className="grid md:grid-cols-2 gap-6">{planningTools.map((tool) => <div key={tool.title} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"><div className="flex items-center mb-4"><div className="p-3 bg-sheraton-cream rounded-lg mr-4"><tool.icon className="h-6 w-6 text-sheraton-navy" /></div><div><h4 className="font-semibold text-sheraton-navy">{tool.title}</h4><p className="text-sm text-gray-600">{tool.description}</p></div></div><Button onClick={() => setNotice(`${tool.title} will be connected to your submitted event proposal.`)} className="w-full bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy">{tool.action}</Button></div>)}</div>
      <div className="bg-white rounded-lg shadow-md p-6"><h4 className="text-lg font-semibold text-sheraton-navy mb-4">Quick Event Creation</h4><div className="grid md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-2">Event Title</label><Input value={planForm.title} onChange={(event) => setPlanForm((form) => ({ ...form, title: event.target.value }))} placeholder="Enter event name" /></div><div><label className="block text-sm font-medium mb-2">Event Date</label><Input type="date" value={planForm.eventDate} onChange={(event) => setPlanForm((form) => ({ ...form, eventDate: event.target.value }))} /></div><div><label className="block text-sm font-medium mb-2">Location</label><Input value={planForm.location} onChange={(event) => setPlanForm((form) => ({ ...form, location: event.target.value }))} placeholder="Event location" /></div><div><label className="block text-sm font-medium mb-2">Expected Guests</label><Input type="number" min="1" value={planForm.expectedGuests} onChange={(event) => setPlanForm((form) => ({ ...form, expectedGuests: event.target.value }))} placeholder="Number of guests" /></div><div className="md:col-span-2"><label className="block text-sm font-medium mb-2">Event Description</label><Textarea value={planForm.description} onChange={(event) => setPlanForm((form) => ({ ...form, description: event.target.value }))} placeholder="Describe your event" /></div><div className="md:col-span-2"><div className="flex items-center justify-between"><span className="text-sm font-medium">Private Event</span><Switch checked={planForm.isPrivate} onCheckedChange={(checked) => setPlanForm((form) => ({ ...form, isPrivate: checked }))} /></div></div></div>{notice && <p role="status" className="mt-4 rounded-md bg-sheraton-gold/20 p-3 text-sm text-sheraton-navy">{notice}</p>}<Button disabled={isSavingPlan} onClick={() => void submitPlan()} className="w-full mt-4 bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy">{isSavingPlan ? "Saving..." : editingPlanId ? "Update Event Proposal" : "Create Event Proposal"}</Button></div>
      {canManageEvents && <div className="bg-white rounded-lg shadow-md p-6"><div className="flex items-center justify-between mb-4"><div><h4 className="text-lg font-semibold text-sheraton-navy">Publish Special Event</h4><p className="text-sm text-gray-600">Manager-only CRUD for the events shown in Browse Events.</p></div>{editingEventId && <Button variant="outline" onClick={() => { setEditingEventId(null); setEventForm(initialEventForm); }}>Cancel edit</Button>}</div><div className="grid md:grid-cols-2 gap-4"><Input value={eventForm.title} onChange={(event) => setEventForm((form) => ({ ...form, title: event.target.value }))} placeholder="Event title" /><Input value={eventForm.category} onChange={(event) => setEventForm((form) => ({ ...form, category: event.target.value }))} placeholder="Category" /><Input type="datetime-local" value={eventForm.startsAt} onChange={(event) => setEventForm((form) => ({ ...form, startsAt: event.target.value }))} /><Input type="datetime-local" value={eventForm.endsAt} onChange={(event) => setEventForm((form) => ({ ...form, endsAt: event.target.value }))} /><Input value={eventForm.location} onChange={(event) => setEventForm((form) => ({ ...form, location: event.target.value }))} placeholder="Location" /><Input value={eventForm.hostName} onChange={(event) => setEventForm((form) => ({ ...form, hostName: event.target.value }))} placeholder="Host name" /><Input type="number" min="0" step="0.01" value={eventForm.price} onChange={(event) => setEventForm((form) => ({ ...form, price: event.target.value }))} placeholder="Price" /><Input value={eventForm.currency} onChange={(event) => setEventForm((form) => ({ ...form, currency: event.target.value }))} placeholder="Currency, e.g. UGX" /><Input type="number" min="1" value={eventForm.capacity} onChange={(event) => setEventForm((form) => ({ ...form, capacity: event.target.value }))} placeholder="Capacity" /><Input value={eventForm.timezone} onChange={(event) => setEventForm((form) => ({ ...form, timezone: event.target.value }))} placeholder="Timezone, e.g. Africa/Kampala" /><Textarea className="md:col-span-2" value={eventForm.description} onChange={(event) => setEventForm((form) => ({ ...form, description: event.target.value }))} placeholder="Event description" /></div><div className="mt-4 flex items-center justify-between"><span className="text-sm font-medium">Featured event</span><Switch checked={eventForm.featured} onCheckedChange={(checked) => setEventForm((form) => ({ ...form, featured: checked }))} /></div><div className="mt-4 flex gap-2"><Button disabled={isSavingPlan} onClick={() => void saveManagedEvent()} className="bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy">{isSavingPlan ? "Saving..." : editingEventId ? "Update Published Event" : "Publish Event"}</Button>{events.length > 0 && <span className="text-xs text-gray-500 self-center">Use the event cards below to view published records.</span>}</div><div className="mt-5 space-y-2">{events.map((event) => <div key={event.id} className="flex items-center justify-between rounded border p-3"><span className="text-sm font-medium text-sheraton-navy">{event.title}</span><span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => editManagedEvent(event)}>Edit</Button><Button size="sm" variant="outline" onClick={() => void deleteManagedEvent(event.id)}>Cancel</Button></span></div>)}</div></div>}
    </div>
  );

  const tabs = [
    { id: "browse", label: "Browse Events", content: renderBrowseEvents },
    { id: "my-events", label: "My Events", content: renderMyEvents },
    { id: "planning", label: "Event Planning", content: renderPlanning },
  ];

  return <div className="min-h-screen bg-gradient-to-br from-sheraton-cream via-white to-sheraton-pearl"><div className="container mx-auto px-4 py-8"><div className="text-center mb-8"><h1 className="text-4xl font-bold text-sheraton-navy mb-4">Special Events & Experiences</h1><p className="text-lg text-gray-600 max-w-2xl mx-auto">Discover exclusive events, create memorable experiences, and connect with fellow guests in our curated collection of special occasions.</p></div><div className="flex justify-center mb-8"><div className="bg-white rounded-lg shadow-md p-1 flex">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-md font-medium transition-colors ${activeTab === tab.id ? "bg-sheraton-gold text-sheraton-navy shadow-sm" : "text-gray-600 hover:text-sheraton-navy"}`}>{tab.label}</button>)}</div></div><div>{tabs.find((tab) => tab.id === activeTab)?.content()}</div>{getTotalEventItems() > 0 && <div className="fixed bottom-6 right-6 z-50"><div className="bg-sheraton-gold text-sheraton-navy rounded-lg shadow-lg p-4"><div className="flex items-center gap-4"><div className="relative"><Calendar className="h-6 w-6" /><Badge className="absolute -top-2 -right-2 bg-sheraton-navy text-sheraton-gold min-w-[20px] h-5 p-0 flex items-center justify-center text-xs">{getTotalEventItems()}</Badge></div><div><div className="font-semibold">{getTotalEventItems()} {getTotalEventItems() === 1 ? "Event" : "Events"}</div><div className="text-xs opacity-80">Ready to book</div></div><Button size="sm" variant="secondary" className="bg-sheraton-navy text-sheraton-gold hover:bg-sheraton-navy/90" onClick={() => { if (requireAuth()) setShowCheckout(true); }}>Checkout</Button></div></div></div>}<EventCheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} cart={eventCart} events={events} onUpdateCart={updateEventCart} onRemoveFromCart={removeFromEventCart} onClearCart={clearEventCart} onBooked={() => void handleBooked()} /></div></div>;
};

export default EventsPage;
