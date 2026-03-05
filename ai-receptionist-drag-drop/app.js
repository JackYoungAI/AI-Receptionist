(function () {
  var supabase = null;
  var session = null;
  var rendered = false;
  var userRole = null; // { isAdmin, clientIdForUser } after login

  // If still "Loading..." after 8s, show help (e.g. Supabase not responding or script error).
  setTimeout(function () {
    if (rendered) return;
    var appEl = document.getElementById("app");
    if (!appEl || appEl.textContent.indexOf("Loading") === -1) return;
    appEl.innerHTML = '<div class="card"><h2>Taking too long?</h2><p>The app could not connect. Check:</p><ul style="margin:0.5rem 0; padding-left:1.25rem;"><li><strong>config.js</strong> has your real Supabase URL and anon key (same as in Supabase Dashboard → Project Settings → API).</li><li>Your Supabase project has the database schema (run <code>sql/schema.sql</code> in SQL Editor) and at least one user (Authentication → Users).</li></ul><p>To see the exact error: <strong>right‑click this page → Inspect</strong> (or press <strong>Ctrl+Shift+I</strong>), then click the <strong>Console</strong> tab. Look for red error messages.</p><p><button type="button" class="btn btn-primary" onclick="location.reload()">Reload</button></p></div>';
  }, 8000);

  function getSupabase() {
    if (supabase) return supabase;
    var c = window.CONFIG;
    if (!c || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) {
      rendered = true;
      document.getElementById("app").innerHTML = '<div class="card"><p>Open <strong>config.js</strong> and add your Supabase URL and Anon Key.</p></div>';
      return null;
    }
    supabase = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
    return supabase;
  }

  function getHash() {
    return (window.location.hash || "#dashboard").replace(/^#/, "");
  }

  function getHashId() {
    var h = getHash();
    if (h.startsWith("client-")) return h.replace("client-", "");
    return null;
  }

  function getViewAsClientId() {
    var h = getHash();
    if (h.startsWith("client-view-")) return h.replace("client-view-", "");
    return null;
  }

  function loadUserRole() {
    var sb = getSupabase();
    if (!sb || !session || !session.user || !session.user.email) return Promise.resolve({ isAdmin: false, clientIdForUser: null });
    var email = session.user.email.toLowerCase();
    return Promise.all([
      sb.from("admins").select("email").eq("email", email).maybeSingle(),
      sb.from("client_users").select("client_id").eq("email", email).maybeSingle()
    ]).then(function (res) {
      var isAdmin = !!(res[0].data && res[0].data.email);
      var clientIdForUser = res[1].data && res[1].data.client_id ? res[1].data.client_id : null;
      return { isAdmin: isAdmin, clientIdForUser: clientIdForUser };
    });
  }

  function setHash(h) {
    window.location.hash = h.startsWith("#") ? h : "#" + h;
  }

  function badge(status, trialExpired) {
    var c = "badge badge-" + (status || "trial");
    var expired = trialExpired && status === "trial" ? '<span class="badge badge-expired">EXPIRED</span>' : "";
    return '<span class="' + c + '">' + (status || "trial") + "</span>" + expired;
  }

  function trialExpired(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr);
    var now = new Date();
    return (now - d) / (24 * 60 * 60 * 1000) > 3;
  }

  function renderLogin() {
    var html = '<div class="card" style="max-width: 360px; margin: 2rem auto;">';
    html += '<h1>AI Receptionist</h1><p style="color:#64748b; margin-bottom:1rem;">Log in</p>';
    html += '<form id="loginForm">';
    html += '<label>Email</label><input type="email" id="loginEmail" required />';
    html += '<label>Password</label><input type="password" id="loginPass" required />';
    html += '<p id="loginError" class="error hidden"></p>';
    html += '<button type="submit" class="btn btn-primary">Log in</button>';
    html += '<p style="margin-top:0.75rem; font-size:0.8rem; color:#64748b;">No account yet? <a href="#signup" id="signupLink">Create one</a></p>';
    html += "</form></div>";
    document.getElementById("app").innerHTML = html;
    document.getElementById("loginForm").onsubmit = function (e) {
      e.preventDefault();
      var sb = getSupabase();
      if (!sb) return;
      var errEl = document.getElementById("loginError");
      errEl.textContent = "";
      errEl.classList.add("hidden");
      var email = document.getElementById("loginEmail").value;
      var password = document.getElementById("loginPass").value;
      sb.auth
        .signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) {
            errEl.textContent = res.error.message || "Invalid email or password.";
            errEl.classList.remove("hidden");
            return;
          }
          setHash("dashboard");
          run();
        })
        .catch(function (err) {
          errEl.textContent = err.message || "Login failed";
          errEl.classList.remove("hidden");
        });
    };
    var link = document.getElementById("signupLink");
    if (link) {
      link.onclick = function (e) {
        e.preventDefault();
        setHash("signup");
        run();
      };
    }
  }

  function renderSignup() {
    var html = '<div class="card" style="max-width: 360px; margin: 2rem auto;">';
    html += '<h1>Create account</h1><p style="color:#64748b; margin-bottom:1rem;">Sign up to manage your AI receptionist.</p>';
    html += '<form id="signupForm">';
    html += '<label>Email</label><input type="email" id="signupEmail" required />';
    html += '<label>Password</label><input type="password" id="signupPass" required />';
    html += '<p id="signupInfo" class="error hidden"></p>';
    html += '<button type="submit" class="btn btn-primary">Sign up</button>';
    html += '<p style="margin-top:0.75rem; font-size:0.8rem; color:#64748b;">Already have an account? <a href="#login" id="loginLink">Log in</a></p>';
    html += "</form></div>";
    document.getElementById("app").innerHTML = html;

    document.getElementById("signupForm").onsubmit = function (e) {
      e.preventDefault();
      var sb = getSupabase();
      if (!sb) return;
      var infoEl = document.getElementById("signupInfo");
      infoEl.textContent = "";
      infoEl.classList.add("hidden");
      var email = document.getElementById("signupEmail").value;
      var password = document.getElementById("signupPass").value;
      sb.auth
        .signUp({ email: email, password: password })
        .then(function (res) {
          if (res.error) {
            infoEl.textContent = res.error.message || "Sign-up failed.";
            infoEl.classList.remove("hidden");
            return;
          }
          if (res.data && res.data.session) {
            setHash("dashboard");
            run();
          } else {
            infoEl.textContent = "Account created. Check your email to confirm, then log in.";
            infoEl.classList.remove("hidden");
          }
        })
        .catch(function (err) {
          infoEl.textContent = err.message || "Sign-up failed.";
          infoEl.classList.remove("hidden");
        });
    };

    var link = document.getElementById("loginLink");
    if (link) {
      link.onclick = function (e) {
        e.preventDefault();
        setHash("login");
        run();
      };
    }
  }

  function renderNoAccess() {
    var html = '<div class="card" style="max-width: 420px; margin: 2rem auto;">';
    html += '<h1>No access</h1><p class="card-desc">Your account is not set up as an admin or a client. Contact the administrator to get access.</p>';
    html += '<button type="button" class="btn btn-primary" id="logoutBtn">Log out</button></div>';
    document.getElementById("app").innerHTML = html;
    document.getElementById("logoutBtn").onclick = function () {
      getSupabase().auth.signOut();
      session = null;
      userRole = null;
      setHash("login");
      run();
    };
  }

  function renderClientPanel(clientId, isViewAsClient) {
    var sb = getSupabase();
    var appEl = document.getElementById("app");
    appEl.innerHTML = "<p>Loading...</p>";

    Promise.all([
      sb.from("clients").select("*").eq("id", clientId).single(),
      sb.from("call_logs").select("*").eq("client_id", clientId).order("timestamp", { ascending: false }).limit(50),
      sb.from("appointments").select("*").eq("client_id", clientId).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }),
      sb.from("workers").select("id,name,specialty").eq("client_id", clientId).order("name", { ascending: true })
    ]).then(function (res) {
      var client = res[0].data;
      var logs = res[1].data || [];
      var appointments = res[2].data || [];
      var workers = res[3].data || [];
      var workerMap = {};
      workers.forEach(function (w) { workerMap[w.id] = w; });
      if (!client) {
        appEl.innerHTML = "<p>Company not found.</p>";
        return;
      }
      var minutes = logs.reduce(function (s, l) { return s + (l.duration_seconds || 0); }, 0) / 60;
      var thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      var minsThisMonth = logs.filter(function (l) { return new Date(l.timestamp) >= thisMonthStart; }).reduce(function (s, l) { return s + (l.duration_seconds || 0); }, 0) / 60;

      var html = '<nav class="nav">';
      if (isViewAsClient) html += '<a href="#dashboard" class="btn btn-secondary" id="backToAdminBtn">← Back to admin</a>';
      html += '<span class="nav-title">Client portal</span><button type="button" class="btn btn-ghost" id="logoutBtn">Log out</button></nav>';
      html += '<div class="card card-section"><h1>' + escapeHtml(client.business_name) + '</h1>';
      html += '<p class="card-desc">' + escapeHtml(client.industry) + ' · Owner: ' + escapeHtml(client.owner_name) + '</p>';
      html += '<p><strong>Status:</strong> ' + badge(client.status, trialExpired(client.trial_start_date)) + ' &nbsp; <strong>Phone:</strong> ' + escapeHtml(client.phone_number) + ' &nbsp; <strong>AI phone:</strong> ' + escapeHtml(client.retell_phone_number || "—") + '</p>';
      html += '<p><strong>Minutes this month:</strong> ' + minsThisMonth.toFixed(1) + ' &nbsp; <strong>Rate:</strong> ' + (client.monthly_rate ? "$" + client.monthly_rate : "—") + ' &nbsp; <strong>Booking:</strong> ' + (client.booking_link ? '<a href="' + escapeHtml(client.booking_link) + '" target="_blank" rel="noopener">Link</a>' : "—") + '</p>';
      html += '<p><strong>Hours:</strong> ' + escapeHtml(client.hours_of_operation || "—") + '</p></div>';

      html += '<div class="card card-section"><h2 class="card-title">Upcoming appointments</h2>';
      if (appointments.length === 0) html += '<p class="muted">No upcoming appointments.</p>';
      else {
        html += '<table class="table"><thead><tr><th>Date & time</th><th>Customer</th><th>Phone</th><th>Worker</th></tr></thead><tbody>';
        appointments.forEach(function (a) {
          var start = new Date(a.start_time);
          var end = new Date(a.end_time);
          var dt = start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
          var endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
          var w = a.worker_id ? workerMap[a.worker_id] : null;
          var workerName = w ? (w.name + (w.specialty ? " (" + w.specialty + ")" : "")) : "—";
          html += '<tr><td>' + escapeHtml(dt) + ' – ' + endStr + '</td><td>' + escapeHtml(a.customer_name || "—") + '</td><td>' + escapeHtml(a.customer_phone || "—") + '</td><td>' + escapeHtml(workerName) + '</td></tr>';
        });
        html += "</tbody></table>";
      }
      html += "</div>";

      html += '<div class="card card-section"><h2 class="card-title">Recent call logs</h2>';
      if (logs.length === 0) html += '<p class="muted">No calls yet.</p>';
      else {
        html += '<table class="table"><thead><tr><th>Date</th><th>Caller</th><th>Duration</th><th>Summary</th></tr></thead><tbody>';
        logs.slice(0, 20).forEach(function (l) {
          var d = l.timestamp ? new Date(l.timestamp).toLocaleString() : "—";
          var dur = l.duration_seconds ? Math.floor(l.duration_seconds / 60) + "m " + (l.duration_seconds % 60) + "s" : "—";
          html += "<tr><td>" + d + "</td><td>" + escapeHtml(l.caller_number || "—") + "</td><td>" + dur + "</td><td>" + escapeHtml((l.summary || "").slice(0, 80)) + "</td></tr>";
        });
        html += "</tbody></table>";
      }
      html += "</div>";

      appEl.innerHTML = html;
      document.getElementById("logoutBtn").onclick = function () {
        sb.auth.signOut();
        session = null;
        userRole = null;
        setHash("login");
        run();
      };
      if (isViewAsClient && document.getElementById("backToAdminBtn")) {
        document.getElementById("backToAdminBtn").onclick = function () {
          setHash("dashboard");
          run();
        };
      }
    }).catch(function (err) {
      appEl.innerHTML = '<div class="card"><p class="error">' + escapeHtml(err.message) + "</p></div>";
    });
  }

  function renderDashboard() {
    var sb = getSupabase();
    var appEl = document.getElementById("app");
    appEl.innerHTML = '<p>Loading...</p>';

    Promise.all([
      sb.from("clients").select("id,business_name,industry,status,phone_number,monthly_rate,trial_start_date,retell_phone_number").order("created_at", { ascending: false }),
      sb.rpc("get_client_minutes_this_month")
    ]).then(function (res) {
      var clients = res[0].data || [];
      var minsData = res[1].data || [];
      var mins = {};
      minsData.forEach(function (r) { mins[r.client_id] = r.minutes || 0; });

      var html = '<nav class="nav"><a href="#dashboard" class="btn btn-primary">Dashboard</a><a href="#add" class="btn btn-secondary">+ Add Client</a>';
      html += '<div class="nav-view-as"><label class="nav-view-as-label">View as client</label><select id="viewAsClientSelect" class="view-as-select"><option value="">— Switch to client view —</option>';
      clients.forEach(function (c) {
        html += '<option value="' + c.id + '">' + escapeHtml(c.business_name) + '</option>';
      });
      html += '</select></div>';
      html += '<button type="button" class="btn btn-secondary" id="logoutBtn">Log out</button></nav>';
      html += '<h1>Clients</h1>';
      html += '<div class="card"><table><thead><tr><th>Business</th><th>Industry</th><th>Status</th><th>AI Phone</th><th>Minutes</th><th>Rate</th></tr></thead><tbody>';
      if (clients.length === 0) {
        html += '<tr><td colspan="6" style="text-align:center; color:#64748b;">No clients. <a href="#add">Add one</a>.</td></tr>';
      } else {
        clients.forEach(function (c) {
          var expired = trialExpired(c.trial_start_date);
          html += '<tr><td><a href="#client-' + c.id + '">' + escapeHtml(c.business_name) + '</a></td>';
          html += '<td>' + escapeHtml(c.industry) + '</td><td>' + badge(c.status, expired) + '</td>';
          html += '<td>' + escapeHtml(c.retell_phone_number || "—") + '</td>';
          html += '<td>' + (mins[c.id] || 0).toFixed(1) + '</td>';
          html += '<td>' + (c.monthly_rate ? "$" + Number(c.monthly_rate).toFixed(0) : "—") + '</td></tr>';
        });
      }
      html += "</tbody></table></div>";
      appEl.innerHTML = html;
      document.getElementById("viewAsClientSelect").onchange = function () {
        var id = this.value;
        if (id) {
          setHash("client-view-" + id);
          run();
        }
      };
      document.getElementById("logoutBtn").onclick = function () {
        sb.auth.signOut();
        session = null;
        userRole = null;
        setHash("login");
        run();
      };
    }).catch(function (err) {
      appEl.innerHTML = '<div class="card"><p class="error">' + escapeHtml(err.message) + '</p><p>Check config.js and that you ran sql/schema.sql in Supabase.</p></div>';
    });
  }

  function renderAdd() {
    var industries = ["Roofing", "Electrical", "Plumbing", "HVAC", "Automotive", "Construction", "Landscaping", "Other"];
    var html = '<nav class="nav"><a href="#dashboard" class="btn btn-secondary">← Dashboard</a><a href="#add" class="btn btn-primary">+ Add Client</a></nav>';
    html += '<h1>Add New Client</h1><div class="card"><form id="addForm">';
    html += '<label>Business name *</label><input name="business_name" required />';
    html += '<label>Owner name *</label><input name="owner_name" required />';
    html += '<label>Industry</label><select name="industry">' + industries.map(function (i) { return "<option>" + i + "</option>"; }).join("") + '</select>';
    html += '<label>Phone number *</label><input name="phone_number" required />';
    html += '<label>Services</label><textarea name="services" rows="3"></textarea>';
    html += '<label>Hours of operation</label><textarea name="hours_of_operation" rows="2"></textarea>';
    html += '<label>Booking link</label><input name="booking_link" placeholder="https://calendly.com/..." />';
    html += '<label>Fallback message</label><textarea name="fallback_message" rows="2">I\'m not sure about that, but I can have the owner call you back.</textarea>';
    html += '<label>Monthly rate ($)</label><input type="number" step="0.01" name="monthly_rate" />';
    html += '<label>Status</label><select name="status"><option value="trial">Trial</option><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option></select>';
    html += '<p id="addError" class="error hidden"></p>';
    html += '<button type="submit" class="btn btn-primary">Save Client</button></form></div>';
    html += '<p style="font-size:0.8rem; color:#64748b;">After saving, create the AI agent in your Retell dashboard and paste the agent ID and phone number on the client page.</p>';
    document.getElementById("app").innerHTML = html;
    document.getElementById("addForm").onsubmit = function (e) {
      e.preventDefault();
      var form = e.target;
      var errEl = document.getElementById("addError");
      errEl.textContent = "";
      errEl.classList.add("hidden");
      var row = {
        business_name: form.business_name.value,
        owner_name: form.owner_name.value,
        industry: form.industry.value,
        phone_number: form.phone_number.value,
        services: form.services.value || null,
        hours_of_operation: form.hours_of_operation.value || null,
        booking_link: form.booking_link.value || null,
        fallback_message: form.fallback_message.value || null,
        monthly_rate: form.monthly_rate.value ? parseFloat(form.monthly_rate.value) : null,
        status: form.status.value,
        faqs: []
      };
      getSupabase().from("clients").insert(row).select().single().then(function (res) {
        setHash("client-" + res.data.id);
        run();
      }).catch(function (err) {
        errEl.textContent = err.message || "Failed to save";
        errEl.classList.remove("hidden");
      });
    };
  }

  function renderClient(id) {
    var sb = getSupabase();
    var appEl = document.getElementById("app");
    appEl.innerHTML = "<p>Loading...</p>";

    Promise.all([
      sb.from("clients").select("*").eq("id", id).single(),
      sb.from("call_logs").select("*").eq("client_id", id).order("timestamp", { ascending: false }),
      sb.from("appointments").select("*").eq("client_id", id).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }),
      sb.from("workers").select("*").eq("client_id", id).order("name", { ascending: true }),
      sb.from("client_users").select("id,email").eq("client_id", id)
    ]).then(function (res) {
      var client = res[0].data;
      var logs = res[1].data || [];
      var appointments = res[2].data || [];
      var workers = res[3].data || [];
      var portalUsers = res[4].data || [];
      var workerMap = {};
      workers.forEach(function (w) { workerMap[w.id] = w; });
      if (!client) {
        appEl.innerHTML = "<p>Client not found.</p>";
        return;
      }
      var minutes = logs.reduce(function (s, l) { return s + (l.duration_seconds || 0); }, 0) / 60;

      var html = '<nav class="nav"><a href="#dashboard" class="btn btn-secondary">← Dashboard</a><a href="#add" class="btn btn-primary">+ Add Client</a>';
      html += '<a href="#client-view-' + id + '" class="btn btn-secondary">View as client</a></nav>';
      html += '<div class="card card-section"><h1>' + escapeHtml(client.business_name) + '</h1>';
      html += '<p class="card-desc">' + escapeHtml(client.industry) + ' · Owner: ' + escapeHtml(client.owner_name) + '</p>';
      html += '<p><strong>Status:</strong> ' + badge(client.status, trialExpired(client.trial_start_date)) + ' &nbsp; <strong>Phone:</strong> ' + escapeHtml(client.phone_number) + ' &nbsp; <strong>AI phone:</strong> ' + escapeHtml(client.retell_phone_number || "—") + '</p>';
      html += '<p><strong>Minutes this month:</strong> ' + minutes.toFixed(1) + ' &nbsp; <strong>Rate:</strong> ' + (client.monthly_rate ? "$" + client.monthly_rate : "—") + ' &nbsp; <strong>Booking:</strong> ' + (client.booking_link ? '<a href="' + escapeHtml(client.booking_link) + '" target="_blank" rel="noopener">Link</a>' : "—") + '</p>';
      html += '<p><strong>Hours:</strong> ' + escapeHtml(client.hours_of_operation || "—") + ' &nbsp; <strong>Fallback:</strong> ' + escapeHtml(client.fallback_message || "—") + '</p>';
      html += '<p id="clientError" class="error hidden"></p>';
      html += '<button type="button" class="btn btn-primary" id="saveClientBtn">Save changes</button> ';
      html += '<button type="button" class="btn btn-danger" id="deleteClientBtn">Delete client</button>';
      html += "</div>";

      var s = client.business_schedule || {};
      var hours = s.hours || {};
      var dayLabels = [{ k: "mon", label: "Monday" }, { k: "tue", label: "Tuesday" }, { k: "wed", label: "Wednesday" }, { k: "thu", label: "Thursday" }, { k: "fri", label: "Friday" }, { k: "sat", label: "Saturday" }, { k: "sun", label: "Sunday" }];
      html += '<div class="card card-section"><h2 class="card-title">Business schedule (for AI booking)</h2>';
      html += '<p style="color:#64748b; font-size:0.9rem;">Set when you’re open so the agent only offers times within these hours and doesn’t double-book.</p>';
      html += '<form id="scheduleForm"><label>Timezone</label><input name="schedule_timezone" value="' + escapeHtml(s.timezone || "America/New_York") + '" placeholder="America/New_York" />';
      html += '<label>Default appointment length (minutes)</label><input type="number" name="schedule_duration" min="5" value="' + (s.appointment_duration_minutes || 30) + '" />';
      html += '<table class="table" style="margin-top:0.5rem;"><thead><tr><th>Day</th><th>Open</th><th>Close</th><th>Closed</th></tr></thead><tbody>';
      dayLabels.forEach(function (d) {
        var h = hours[d.k];
        var closed = !h || !h.open || !h.close;
        var openVal = (h && h.open) ? h.open : "09:00";
        var closeVal = (h && h.close) ? h.close : "17:00";
        html += '<tr><td>' + d.label + '</td>';
        html += '<td><input type="time" name="open_' + d.k + '" value="' + escapeHtml(openVal) + '" style="width:6rem;" /></td>';
        html += '<td><input type="time" name="close_' + d.k + '" value="' + escapeHtml(closeVal) + '" style="width:6rem;" /></td>';
        html += '<td><input type="checkbox" name="closed_' + d.k + '" ' + (closed ? "checked" : "") + ' /></td></tr>';
      });
      html += '</tbody></table><p id="scheduleSaveMsg" class="hidden" style="margin-top:0.5rem;"></p>';
      html += '<button type="button" class="btn btn-primary" id="saveScheduleBtn">Save schedule</button></form></div>';

      html += '<div class="card card-section"><h2 class="card-title">Workers & specialties</h2>';
      html += '<p class="card-desc">Add staff so you can assign who runs each appointment.</p>';
      if (workers.length === 0) html += '<p class="muted">No workers yet. Add one below.</p>';
      else {
        html += '<table class="table"><thead><tr><th>Name</th><th>Specialty</th><th></th></tr></thead><tbody>';
        workers.forEach(function (w) {
          html += '<tr><td>' + escapeHtml(w.name) + '</td><td>' + escapeHtml(w.specialty || "—") + '</td><td><button type="button" class="btn btn-sm btn-ghost" data-worker-id="' + w.id + '">Remove</button></td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '<form id="addWorkerForm" class="form-inline"><label>Name</label><input name="worker_name" placeholder="e.g. Jane" required />';
      html += '<label>Specialty</label><input name="worker_specialty" placeholder="e.g. Haircuts, Color" />';
      html += '<p id="workerMsg" class="hidden msg"></p><button type="submit" class="btn btn-primary">Add worker</button></form></div>';

      html += '<div class="card card-section"><h2 class="card-title">Upcoming appointments</h2>';
      if (appointments.length === 0) html += '<p class="muted">No upcoming appointments. The AI will book new ones when callers request them.</p>';
      else {
        html += '<table class="table"><thead><tr><th>Date & time</th><th>Customer</th><th>Phone</th><th>Worker</th></tr></thead><tbody>';
        appointments.forEach(function (a) {
          var start = new Date(a.start_time);
          var end = new Date(a.end_time);
          var dt = start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
          var endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
          var w = a.worker_id ? workerMap[a.worker_id] : null;
          var workerName = w ? (w.name + (w.specialty ? " (" + w.specialty + ")" : "")) : "—";
          html += '<tr><td>' + escapeHtml(dt) + ' – ' + endStr + '</td><td>' + escapeHtml(a.customer_name || "—") + '</td><td>' + escapeHtml(a.customer_phone || "—") + '</td><td>' + escapeHtml(workerName) + '</td></tr>';
        });
        html += "</tbody></table>";
      }
      html += '<form id="addApptForm" class="form-grid"><h3 class="form-subtitle">Add appointment manually</h3>';
      html += '<label>Date</label><input type="date" name="appt_date" required />';
      html += '<label>Start time</label><input type="time" name="appt_time" required />';
      html += '<label>Duration (minutes)</label><input type="number" name="appt_duration" value="30" min="5" />';
      html += '<label>Assign to worker</label><select name="appt_worker_id"><option value="">— No one —</option>';
      workers.forEach(function (w) {
        html += '<option value="' + w.id + '">' + escapeHtml(w.name) + (w.specialty ? ' — ' + escapeHtml(w.specialty) : '') + '</option>';
      });
      html += '</select>';
      html += '<label>Customer name</label><input name="appt_name" />';
      html += '<label>Customer phone</label><input name="appt_phone" />';
      html += '<p id="addApptError" class="error hidden"></p>';
      html += '<button type="submit" class="btn btn-secondary">Add appointment</button></form></div>';

      html += '<div class="card card-section"><h2 class="card-title">Edit</h2><form id="editForm">';
      html += '<label>Business name</label><input name="business_name" value="' + escapeHtml(client.business_name) + '" />';
      html += '<label>Owner</label><input name="owner_name" value="' + escapeHtml(client.owner_name) + '" />';
      html += '<label>Industry</label><input name="industry" value="' + escapeHtml(client.industry) + '" />';
      html += '<label>Phone</label><input name="phone_number" value="' + escapeHtml(client.phone_number) + '" />';
      html += '<label>Retell agent ID</label><input name="retell_agent_id" value="' + escapeHtml(client.retell_agent_id || "") + '" placeholder="From Retell dashboard" />';
      html += '<label>Retell phone number</label><input name="retell_phone_number" value="' + escapeHtml(client.retell_phone_number || "") + '" placeholder="e.g. +1234567890" />';
      html += '<label>Status</label><select name="status">';
      ["trial", "active", "paused", "cancelled"].forEach(function (s) {
        html += '<option value="' + s + '"' + (client.status === s ? " selected" : "") + ">" + s + "</option>";
      });
      html += '</select></form></div>';

      html += '<div class="card card-section"><h2 class="card-title">Client portal access</h2>';
      html += '<p class="card-desc">Emails listed here can log in and see this company\'s read-only client panel (minutes, appointments, call logs).</p>';
      if (portalUsers.length === 0) html += '<p class="muted">No portal users yet. Add an email below.</p>';
      else {
        html += '<table class="table"><thead><tr><th>Email</th><th></th></tr></thead><tbody>';
        portalUsers.forEach(function (u) {
          html += '<tr><td>' + escapeHtml(u.email) + '</td><td><button type="button" class="btn btn-sm btn-ghost" data-portal-id="' + u.id + '">Remove</button></td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '<form id="addPortalUserForm" class="form-inline"><label>Email</label><input type="email" name="portal_email" placeholder="client@example.com" required />';
      html += '<p id="portalMsg" class="hidden msg"></p><button type="submit" class="btn btn-primary">Add portal access</button></form></div>';

      html += '<div class="card card-section"><h2 class="card-title">Call logs</h2><table class="table"><thead><tr><th>Date</th><th>Caller</th><th>Duration</th><th>Summary</th></tr></thead><tbody>';
      if (logs.length === 0) html += '<tr><td colspan="4" style="text-align:center; color:#64748b;">No calls yet.</td></tr>';
      else logs.forEach(function (l) {
        var d = l.timestamp ? new Date(l.timestamp).toLocaleString() : "—";
        var dur = l.duration_seconds ? Math.floor(l.duration_seconds / 60) + "m " + (l.duration_seconds % 60) + "s" : "—";
        html += "<tr><td>" + d + "</td><td>" + escapeHtml(l.caller_number || "—") + "</td><td>" + dur + "</td><td>" + escapeHtml((l.summary || "").slice(0, 80)) + "</td></tr>";
      });
      html += "</tbody></table></div>";

      appEl.innerHTML = html;

      document.getElementById("addPortalUserForm").onsubmit = function (e) {
        e.preventDefault();
        var form = document.getElementById("addPortalUserForm");
        var msgEl = document.getElementById("portalMsg");
        var email = form.portal_email.value.trim().toLowerCase();
        sb.from("client_users").insert({ client_id: id, email: email }).then(function () {
          msgEl.textContent = "Access added. They can log in with this email.";
          msgEl.classList.remove("hidden");
          msgEl.style.color = "var(--success)";
          form.portal_email.value = "";
          setHash("client-" + id);
          run();
        }).catch(function (err) {
          msgEl.textContent = err.message || "Failed (email may already have access elsewhere).";
          msgEl.classList.remove("hidden");
          msgEl.style.color = "";
        });
      };
      appEl.querySelectorAll("[data-portal-id]").forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm("Remove portal access for this email?")) return;
          sb.from("client_users").delete().eq("id", btn.getAttribute("data-portal-id")).then(function () {
            setHash("client-" + id);
            run();
          });
        };
      });

      document.getElementById("saveScheduleBtn").onclick = function () {
        var form = document.getElementById("scheduleForm");
        var msgEl = document.getElementById("scheduleSaveMsg");
        var hours = {};
        ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach(function (k) {
          if (form["closed_" + k].checked) hours[k] = null;
          else hours[k] = { open: form["open_" + k].value || "09:00", close: form["close_" + k].value || "17:00" };
        });
        var schedule = {
          timezone: form.schedule_timezone.value || "America/New_York",
          appointment_duration_minutes: parseInt(form.schedule_duration.value, 10) || 30,
          hours: hours
        };
        sb.from("clients").update({ business_schedule: schedule }).eq("id", id).then(function () {
          msgEl.textContent = "Schedule saved. The AI will use this for booking.";
          msgEl.classList.remove("hidden");
          msgEl.style.color = "green";
        }).catch(function (err) {
          msgEl.textContent = err.message || "Failed to save";
          msgEl.classList.remove("hidden");
          msgEl.style.color = "";
        });
      };

      document.getElementById("addWorkerForm").onsubmit = function (e) {
        e.preventDefault();
        var form = document.getElementById("addWorkerForm");
        var msgEl = document.getElementById("workerMsg");
        sb.from("workers").insert({ client_id: id, name: form.worker_name.value.trim(), specialty: form.worker_specialty.value.trim() || null }).then(function () {
          msgEl.textContent = "Worker added.";
          msgEl.classList.remove("hidden");
          msgEl.style.color = "var(--success)";
          form.worker_name.value = "";
          form.worker_specialty.value = "";
          setHash("client-" + id);
          run();
        }).catch(function (err) {
          msgEl.textContent = err.message || "Failed to add worker";
          msgEl.classList.remove("hidden");
          msgEl.style.color = "";
        });
      };
      appEl.querySelectorAll("[data-worker-id]").forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm("Remove this worker?")) return;
          sb.from("workers").delete().eq("id", btn.getAttribute("data-worker-id")).then(function () {
            setHash("client-" + id);
            run();
          });
        };
      });

      document.getElementById("addApptForm").onsubmit = function (e) {
        e.preventDefault();
        var form = document.getElementById("addApptForm");
        var errEl = document.getElementById("addApptError");
        errEl.textContent = "";
        errEl.classList.add("hidden");
        var dateStr = form.appt_date.value;
        var timeStr = form.appt_time.value;
        var dur = parseInt(form.appt_duration.value, 10) || 30;
        var workerId = form.appt_worker_id.value || null;
        var start = new Date(dateStr + "T" + timeStr);
        var end = new Date(start.getTime() + dur * 60 * 1000);
        sb.from("appointments").insert({
          client_id: id,
          worker_id: workerId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          customer_name: form.appt_name.value || null,
          customer_phone: form.appt_phone.value || null
        }).then(function () {
          setHash("client-" + id);
          run();
        }).catch(function (err) {
          errEl.textContent = err.message || "Failed to add appointment";
          errEl.classList.remove("hidden");
        });
      };

      document.getElementById("saveClientBtn").onclick = function () {
        var form = document.getElementById("editForm");
        var errEl = document.getElementById("clientError");
        errEl.textContent = "";
        errEl.classList.add("hidden");
        sb.from("clients").update({
          business_name: form.business_name.value,
          owner_name: form.owner_name.value,
          industry: form.industry.value,
          phone_number: form.phone_number.value,
          retell_agent_id: form.retell_agent_id.value || null,
          retell_phone_number: form.retell_phone_number.value || null,
          status: form.status.value
        }).eq("id", id).then(function () {
          errEl.textContent = "Saved.";
          errEl.classList.remove("hidden");
          errEl.style.color = "green";
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.classList.remove("hidden");
          errEl.style.color = "";
        });
      };

      document.getElementById("deleteClientBtn").onclick = function () {
        if (!confirm("Delete this client?")) return;
        sb.from("clients").delete().eq("id", id).then(function () {
          setHash("dashboard");
          run();
        });
      };
    }).catch(function (err) {
      appEl.innerHTML = '<div class="card"><p class="error">' + escapeHtml(err.message) + "</p></div>";
    });
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function run() {
    var sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession()
      .then(function (res) {
        session = res.data.session;
        if (!session) {
          rendered = true;
          var hash = getHash();
          if (hash === "signup") {
            renderSignup();
          } else {
            setHash("login");
            renderLogin();
          }
          return;
        }
        return loadUserRole().then(function (role) {
          userRole = role;
          rendered = true;
          var hash = getHash();
          var clientId = getHashId();
          var viewAsId = getViewAsClientId();

          if (viewAsId && role.isAdmin) {
            renderClientPanel(viewAsId, true);
            return;
          }
          if (role.clientIdForUser && !role.isAdmin) {
            renderClientPanel(role.clientIdForUser, false);
            return;
          }
          if (!role.isAdmin && !role.clientIdForUser) {
            renderNoAccess();
            return;
          }
          if (hash === "login" || hash === "") {
            setHash("dashboard");
            run();
            return;
          }
          if (hash === "dashboard") renderDashboard();
          else if (hash === "add") renderAdd();
          else if (clientId) renderClient(clientId);
          else renderDashboard();
        });
      })
      .catch(function (err) {
        rendered = true;
        var appEl = document.getElementById("app");
        appEl.innerHTML = '<div class="card"><h2>Connection error</h2><p class="error">' + escapeHtml(err && err.message ? err.message : "Could not reach Supabase.") + '</p><p>Check <strong>config.js</strong>: use the exact Project URL and anon key from Supabase → Project Settings → API. Then <a href="javascript:location.reload()">reload</a>.</p></div>';
      });
  }

  window.addEventListener("hashchange", run);
  run();
})();
