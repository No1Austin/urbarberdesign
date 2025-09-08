const TARGET_CALENDAR_ID = "primary"; // or your dedicated calendar ID
const SLOT_PADDING_MINUTES = 0; // add 5/10/15 for cleanup buffer if you want

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    if (!data.start || !data.end) return _json({ ok: false, message: "Missing start/end" });

    const start = new Date(data.start);
    const end   = new Date(data.end);

    // Optional buffer window around the requested slot
    if (SLOT_PADDING_MINUTES > 0) {
      start.setMinutes(start.getMinutes() - SLOT_PADDING_MINUTES);
      end.setMinutes(end.getMinutes() + SLOT_PADDING_MINUTES);
    }

    // Prevent race conditions
    const lock = LockService.getScriptLock();
    lock.waitLock(5000);

    const cal = CalendarApp.getCalendarById(TARGET_CALENDAR_ID);

    // Check overlap within a reasonable window
    const existing = cal.getEvents(
      new Date(start.getTime() - 12 * 60 * 60 * 1000),
      new Date(end.getTime() + 12 * 60 * 60 * 1000)
    );
    const hasOverlap = existing.some(ev => start < ev.getEndTime() && end > ev.getStartTime());
    if (hasOverlap) {
      lock.releaseLock();
      return _json({ ok: false, conflict: true, message: "This time slot is already booked. Please pick another time." });
    }

    // Create event using original unpadded times
    const unpaddedStart = new Date(data.start);
    const unpaddedEnd   = new Date(data.end);

    const name  = data.fullName || "Client";
    const title = `Urbarber - ${name}`;
    const description =
      `Gender: ${data.gender || "-"}\n` +
      `Price: $${data.price ?? "-"}\n` +
      `Phone: ${data.phone || "-"}\n` +
      `Email: ${data.email || "-"}\n` +
      `In-home: ${data.inHome ? "Yes" : "No"}\n` +
      `Notes: ${data.notes || "-"}`;

    const location = data.location || (data.inHome ? "Client address" : "Urbarber Barbershop");

    const event = cal.createEvent(title, unpaddedStart, unpaddedEnd, { description, location });

    // Optional: add guest so Google sends invite
    if (data.email) {
      try { event.addGuest(data.email); } catch (_) {}
    }

    // Optional: send a custom confirmation email
    if (data.email) {
      const fmt = Utilities.formatDate;
      const tz = Session.getScriptTimeZone() || "America/Toronto";
      const startStr = fmt(unpaddedStart, tz, "EEE, MMM d, yyyy h:mm a");
      const endStr   = fmt(unpaddedEnd,   tz, "h:mm a");

      const body =
        `Hi ${name},\n\n` +
        `Your appointment is confirmed.\n\n` +
        `When: ${startStr} – ${endStr}\n` +
        `Where: ${location}\n\n` +
        `Details:\n${description}\n\n` +
        `If you need to make changes, reply to this email.\n\n` +
        `— Urbarber`;

      try { MailApp.sendEmail(data.email, "Urbarber Appointment Confirmation", body); } catch (_) {}
    }

    lock.releaseLock();
    return _json({ ok: true, id: event.getId(), htmlLink: event.getHtmlLink?.() });

  } catch (err) {
    return _json({ ok: false, message: err.message });
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
