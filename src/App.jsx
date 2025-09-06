import React, { useMemo, useState } from "react";

/* ============ Logo (uses your circle photo) ============ */
function UrbarberLogo({ className = "w-10 h-10" }) {
  return (
    <img
      src="/logo.jpg" // place your photo at /public/logo.jpg
      alt="Urbarber logo"
      className={`rounded-full object-cover ${className}`}
    />
  );
}

/* -------- Build a Google Calendar prefilled URL -------- */
function buildGoogleCalendarUrl({ title, details, location, startDateTime, endDateTime }) {
  const fmt = (d) => {
    const iso = new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return iso;
  };
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    location,
    dates: `${fmt(startDateTime)}/${fmt(endDateTime)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ------------- Generate an .ics calendar file ---------- */
function downloadICS({ title, description, location, startDateTime, endDateTime }) {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const dt = (d) => {
    const x = new Date(d);
    return (
      x.getUTCFullYear() +
      pad(x.getUTCMonth() + 1) +
      pad(x.getUTCDate()) +
      "T" +
      pad(x.getUTCHours()) +
      pad(x.getUTCMinutes()) +
      pad(x.getUTCSeconds()) +
      "Z"
    );
  };

  const uid = `${Date.now()}@urbarber`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Urbarber//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(startDateTime)}`,
    `DTEND:${dt(endDateTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `urbarber-booking-${uid}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  /* ---- State for booking form ---- */
  const [form, setForm] = useState({
    fullName: "",
    gender: "Male",
    email: "",
    phone: "",
    date: "",
    time: "",
    location: "123 Main St, Your City",
    inHome: false,
    notes: "",
  });

  /* ---- Pricing ---- */
  const basePrice = 25;
  const homeExtra = 10;
  const price = useMemo(() => basePrice + (form.inHome ? homeExtra : 0), [form.inHome]);

  /* ---- Handlers ---- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const valid = useMemo(() => {
    return form.fullName.trim() && form.email.trim() && form.phone.trim() && form.date && form.time;
  }, [form]);

  const handleBook = async () => {
    const startLocal = new Date(`${form.date}T${form.time}`);
    const endLocal = new Date(startLocal.getTime() + 45 * 60 * 1000);

    const title = `Urbarber - ${form.fullName}`;
    const description =
      `Service: Standard cut${form.inHome ? " (Home Service)" : " (In-Shop)"}\n` +
      `Gender: ${form.gender}\n` +
      `Price: $${price}\n` +
      `Phone: ${form.phone}\n` +
      `Email: ${form.email}\n` +
      `Notes: ${form.notes || "-"}`;

    const location = form.inHome ? form.location : "Urbarber Barbershop";

    // 1) Download ICS
    downloadICS({
      title,
      description,
      location,
      startDateTime: startLocal,
      endDateTime: endLocal,
    });

    // 2) Open Google Calendar prefilled for client
    const gcUrl = buildGoogleCalendarUrl({
      title,
      details: description,
      location,
      startDateTime: startLocal,
      endDateTime: endLocal,
    });
    window.open(gcUrl, "_blank");

    // 3) (Optional) Write into your own Google Calendar via Vercel function
    try {
      const webhook = import.meta.env.VITE_BOOKING_WEBHOOK_URL;
      if (webhook) {
        const res = await fetch(webhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // "X-Booking-Key": import.meta.env.VITE_BOOKING_SECRET || "", // optional shared secret
          },
          body: JSON.stringify({
            fullName: form.fullName,
            gender: form.gender,
            email: form.email,
            phone: form.phone,
            start: startLocal.toISOString(),
            end: endLocal.toISOString(),
            inHome: form.inHome,
            location,
            notes: form.notes,
            price,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          console.log("Booked on server:", data);
        } else {
          console.warn("Booking server error:", data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ==== Services with images ==== */
  const SERVICES = [
    {
      name: "Standard Cut",
      img: "/services/standard.jpg",
      desc: "Clean, sharp, and tailored to you.",
      price: "$25",
    },
    {
      name: "Beard Trim",
      img: "/services/beard.jpg",
      desc: "Crisp edges and shape for your beard.",
      price: "$25",
    },
    {
      name: "Line Up",
      img: "/services/line.jpg",
      desc: "Sharp line work to keep you fresh.",
      price: "$25",
    },
  ];

  return (
    <div className="min-h-screen bg-[#3b2f2f] text-white">
      {/* NAVBAR (kept light) */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UrbarberLogo className="w-9 h-9" />
            <span className="font-bold text-xl tracking-tight text-neutral-900">Urbarber</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm text-neutral-800">
            <a href="#services" className="hover:opacity-80">Services</a>
            <a href="#pricing" className="hover:opacity-80">Pricing</a>
            <a href="#booking" className="hover:opacity-80">Book</a>
            <a href="#contact" className="hover:opacity-80">Contact</a>
          </nav>
          <a href="#booking" className="px-4 py-2 rounded-2xl bg-black text-white text-sm shadow">Book now</a>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Fresh fades, clean lines. <span className="text-gray-300">On your schedule.</span>
            </h1>
            <p className="mt-4 text-gray-200">
              Modern cuts in-shop or right at your doorstep. Simple pricing, easy booking.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#booking" className="px-5 py-3 rounded-2xl bg-black text-white text-sm shadow">Book an appointment</a>
              <a href="#services" className="px-5 py-3 rounded-2xl border border-[#7a6161] text-sm">See services</a>
            </div>
            <div className="mt-6 text-xs text-gray-300">From $25 • +$10 home service</div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-lg border border-[#7a6161]">
            <img
              src="/barbing.jpg" /* place this in /public/barbing.jpg or use your own file */
              alt="Barber at work"
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        {/* SERVICES (images) */}
        <section id="services" className="bg-[#4a3a3a] border-y border-[#6b5555]">
          <div className="max-w-6xl mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold">Services</h2>
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              {SERVICES.map((s) => (
                <div key={s.name} className="p-6 rounded-3xl border border-[#7a6161] shadow-sm bg-[#5c4646]">
                  <div className="rounded-2xl overflow-hidden border border-[#7a6161]">
                    <img
                      src={s.img}
                      alt={s.name}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-4 font-semibold">{s.name}</div>
                  <div className="text-sm text-gray-200">{s.desc}</div>
                  <div className="mt-2 text-sm text-gray-300">{s.price}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold">Pricing</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl border border-[#7a6161] shadow-sm bg-[#5c4646]">
              <div className="text-sm uppercase text-gray-300">Base</div>
              <div className="text-3xl font-extrabold mt-2">${basePrice}</div>
              <div className="text-sm text-gray-200 mt-1">In-shop appointment</div>
            </div>
            <div className="p-6 rounded-3xl border border-[#7a6161] shadow-sm bg-[#5c4646]">
              <div className="text-sm uppercase text-gray-300">Home Service</div>
              <div className="text-3xl font-extrabold mt-2">${basePrice + homeExtra}</div>
              <div className="text-sm text-gray-200 mt-1">We come to you (+$10)</div>
            </div>
          </div>
        </section>

        {/* BOOKING */}
        <section id="booking" className="bg-[#4a3a3a] border-y border-[#6b5555]">
          <div className="max-w-6xl mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold">Book an appointment</h2>
            <p className="mt-2 text-gray-200 text-sm">
              Fill your details. We’ll generate a calendar invite you can save and open Google Calendar prefilled.
              A serverless function can also add it directly to our shop calendar.
            </p>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              {/* Form card */}
              <div className="p-6 rounded-3xl border border-[#7a6161] shadow-sm bg-[#5c4646]">
                <div className="grid gap-4">
                  <label className="grid gap-1 text-sm">
                    <span>Full name</span>
                    <input
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white placeholder-gray-300 focus:outline-none"
                      placeholder="Your name"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span>Gender</span>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white focus:outline-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="grid gap-1 text-sm">
                      <span>Date</span>
                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white focus:outline-none"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>Time</span>
                      <input
                        type="time"
                        name="time"
                        value={form.time}
                        onChange={handleChange}
                        className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white focus:outline-none"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span>Phone</span>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white placeholder-gray-300 focus:outline-none"
                      placeholder="(555) 555-5555"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span>Email</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white placeholder-gray-300 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" name="inHome" checked={form.inHome} onChange={handleChange} />
                    <span>Home service (we come to you)</span>
                  </label>

                  {form.inHome && (
                    <label className="grid gap-1 text-sm">
                      <span>Home address</span>
                      <input
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white placeholder-gray-300 focus:outline-none"
                        placeholder="Street, City"
                      />
                    </label>
                  )}

                  <label className="grid gap-1 text-sm">
                    <span>Notes (optional)</span>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      className="px-3 py-2 rounded-xl border border-[#7a6161] bg-[#3b2f2f] text-white placeholder-gray-300 focus:outline-none"
                      placeholder="Any preferences"
                    />
                  </label>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-200">Price</div>
                    <div className="font-bold text-lg">${price}</div>
                  </div>

                  <button
                    disabled={!valid}
                    onClick={handleBook}
                    className={`mt-2 px-5 py-3 rounded-2xl text-sm shadow ${
                      valid ? "bg-black text-white" : "bg-[#7a6161] text-gray-300"
                    }`}
                  >
                    Book now & add to calendar
                  </button>

                  <div className="text-xs text-gray-300">No online payment required.</div>
                </div>
              </div>

              {/* Info card */}
              <div className="p-6 rounded-3xl border border-[#7a6161] shadow-sm bg-[#5c4646]">
                <h3 className="font-semibold">How it works</h3>
                <ol className="list-decimal ml-5 mt-3 space-y-2 text-sm text-gray-200">
                  <li>Fill your details and choose in-shop or home service.</li>
                  <li>We generate an .ics and open Google Calendar prefilled.</li>
                  <li>Our serverless function can also add it to our shop calendar.</li>
                </ol>
                <div className="mt-4 p-4 rounded-2xl bg-[#3b2f2f] border border-[#7a6161] text-sm">
                  See you soon!
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold">Contact</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-6 text-sm">
            <div className="p-6 rounded-3xl border border-[#7a6161] bg-[#5c4646]">
              <div className="font-semibold">Shop</div>
              <div className="mt-1 text-gray-200">Urbarber Barbershop</div>
              <div className="text-gray-200">218 River Road E Kitchener</div>
            </div>
            <div className="p-6 rounded-3xl border border-[#7a6161] bg-[#5c4646]">
              <div className="font-semibold">Hours</div>
              <div className="mt-1 text-gray-200">Mon – Sun:</div>
              <div className="mt-1 text-gray-200">10:00AM – 10:00PM</div>
            </div>
            <div className="p-6 rounded-3xl border border-[#7a6161] bg-[#5c4646]">
              <div className="font-semibold">Reach us</div>
              <div className="mt-1 text-gray-200">Phone: (437) 566 1645</div>
              <div className="text-gray-200">Email: austinamadi.e@gmail.com</div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#6b5555] bg-[#4a3a3a]">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UrbarberLogo className="w-6 h-6" />
            <span>© {new Date().getFullYear()} Urbarber</span>
          </div>
          <a href="#booking" className="hover:opacity-80">Book now</a>
        </div>
      </footer>
    </div>
  );
}
