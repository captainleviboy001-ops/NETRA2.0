// NETRA — Shared utility module
// Handles auth, navigation, sidebar toggle, and shared helpers.

const NETRA = (() => {

  // ── Auth ──────────────────────────────────────────────────────
  function requireAuth() {
    const auth = sessionStorage.getItem('netra_auth');
    if (!auth) {
      window.location.href = 'login.html';
      return null;
    }
    return JSON.parse(auth);
  }

  function getUser() {
    const raw = sessionStorage.getItem('netra_auth');
    return raw ? JSON.parse(raw) : null;
  }

  function logout() {
    sessionStorage.removeItem('netra_auth');
    window.location.href = 'login.html';
  }

  // ── Sidebar ───────────────────────────────────────────────────
  function initSidebar(activePageId) {
    const user = requireAuth();
    if (!user) return;

    // Populate user info in sidebar
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    // Mark active nav item
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === activePageId);
    });

    // Mobile toggle
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburger && sidebar && overlay) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  // ── Grade helpers ─────────────────────────────────────────────
  const GRADES = [
    { key: 'none',          label: 'No DR',           css: 'grade-none' },
    { key: 'mild',          label: 'Mild DR',          css: 'grade-mild' },
    { key: 'moderate',      label: 'Moderate DR',      css: 'grade-moderate' },
    { key: 'severe',        label: 'Severe DR',        css: 'grade-severe' },
    { key: 'proliferative', label: 'Proliferative DR', css: 'grade-proliferative' },
  ];

  const RECOMMENDATIONS = {
    none:           'No signs of diabetic retinopathy detected. Recommend routine annual follow-up.',
    mild:           'Mild early changes detected. Recommend follow-up within 6–12 months.',
    moderate:       'Moderate non-proliferative DR detected. Refer to an ophthalmologist within 3 months.',
    severe:         'Severe non-proliferative DR detected. Urgent ophthalmology referral recommended.',
    proliferative:  'Proliferative DR detected. Urgent specialist referral required — risk of vision loss is high.',
  };

  function gradeInfo(key) {
    return GRADES.find(g => g.key === key) || GRADES[0];
  }

  function badgeHTML(key) {
    const g = gradeInfo(key);
    return `<span class="grade-badge ${g.css}">${g.label}</span>`;
  }

  function recommendation(key) {
    return RECOMMENDATIONS[key] || '';
  }

  // ── Mock data store (localStorage) ───────────────────────────
  function getScreenings() {
    const raw = localStorage.getItem('netra_screenings');
    return raw ? JSON.parse(raw) : getSeedData();
  }

  function saveScreenings(data) {
    localStorage.setItem('netra_screenings', JSON.stringify(data));
  }

  function addScreening(record) {
    const all = getScreenings();
    all.unshift(record);
    saveScreenings(all);
    return record;
  }

  function getScreeningById(id) {
    return getScreenings().find(s => s.id === id) || null;
  }

  // ── Seed data ─────────────────────────────────────────────────
  function getSeedData() {
    return [
      { id: 's001', patientName: 'Meena Krishnan',  age: 58, date: '2026-09-14', grade: 'moderate',      confidence: 87, imageUrl: null, heatmapUrl: null },
      { id: 's002', patientName: 'Rajan Pillai',    age: 63, date: '2026-09-13', grade: 'none',           confidence: 94, imageUrl: null, heatmapUrl: null },
      { id: 's003', patientName: 'Sunita Sharma',   age: 49, date: '2026-09-12', grade: 'mild',           confidence: 79, imageUrl: null, heatmapUrl: null },
      { id: 's004', patientName: 'Arvind Kumar',    age: 71, date: '2026-09-11', grade: 'severe',         confidence: 91, imageUrl: null, heatmapUrl: null },
      { id: 's005', patientName: 'Lakshmi Devi',    age: 55, date: '2026-09-10', grade: 'proliferative',  confidence: 96, imageUrl: null, heatmapUrl: null },
      { id: 's006', patientName: 'Priya Nair',      age: 42, date: '2026-09-09', grade: 'none',           confidence: 98, imageUrl: null, heatmapUrl: null },
      { id: 's007', patientName: 'Mohan Das',       age: 66, date: '2026-09-08', grade: 'mild',           confidence: 82, imageUrl: null, heatmapUrl: null },
      { id: 's008', patientName: 'Anitha George',   age: 53, date: '2026-09-07', grade: 'moderate',       confidence: 85, imageUrl: null, heatmapUrl: null },
    ];
  }

  // ── Format date ───────────────────────────────────────────────
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Simulate AI analysis (fallback / offline mode) ────────────
  function simulateAnalysis(imageDataUrl, callback) {
    const grades = ['none','mild','moderate','severe','proliferative'];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const confidence = Math.floor(Math.random() * 20) + 78; // 78–98%
    setTimeout(() => callback({ grade, confidence }), 2200);
  }

  // ── Response normaliser ───────────────────────────────────────
  /**
   * Adapter: translates the raw n8n webhook response into NETRA's
   * normalized internal shape. All field-mapping lives here — the rest
   * of the app never needs to know the webhook's field names.
   *
   * Input (n8n /screen response):
   * {
   *   screening_id, prediction, confidence, severity, status,
   *   gradcam:  { image_url },
   *   referral: { required, urgency, reason, recommendation }
   * }
   *
   * Output (normalized):
   * {
   *   class_id    : 0–4 integer  (null if unrecognised)
   *   label       : human-readable severity string
   *   confidence  : 0–1 float as returned by the API
   *   heatmap_url : string | null
   *   all_probs   : null  (not provided by this webhook — display code handles null gracefully)
   *   referral    : referral object | null
   *   screening_id: string | null
   *   status      : string | null
   * }
   */
  function normalizeN8nResponse(raw) {
    const severityMap = {
      // No DR
      'no dr':            0,
      'none':             0,
      'normal':           0,
      'no diabetic retinopathy': 0,
      // Mild
      'mild':             1,
      'mild dr':          1,
      'mild npdr':        1,
      'mild non-proliferative diabetic retinopathy': 1,
      // Moderate
      'moderate':         2,
      'moderate dr':      2,
      'moderate npdr':    2,
      'moderate non-proliferative diabetic retinopathy': 2,
      // Severe
      'severe':           3,
      'severe dr':        3,
      'severe npdr':      3,
      'severe non-proliferative diabetic retinopathy': 3,
      // Proliferative
      'proliferative':    4,
      'proliferative dr': 4,
      'pdr':              4,
      'proliferative diabetic retinopathy': 4,
    };

    const severityKey = (raw.severity || '').toLowerCase().trim();
    const classId = severityMap[severityKey] ?? null;

    return {
      class_id:     classId,
      label:        raw.severity || raw.prediction || 'Unknown',
      confidence:   raw.confidence ?? 0,
      heatmap_url:  (raw.gradcam && raw.gradcam.image_url) ? raw.gradcam.image_url : null,
      all_probs:    null,  // not provided by this webhook
      referral:     raw.referral || null,
      screening_id: raw.screening_id || null,
      status:       raw.status || null,
    };
  }

  // ── Real AI analysis via n8n screen endpoint ──────────────────
  /**
   * POST the retinal image to the configured /screen endpoint.
   * Sends as multipart/form-data with the image under the field "image".
   * No auth headers — the n8n webhook has no authentication configured.
   *
   * Flow: fetch → normalizeN8nResponse() → map to NETRA grade → callback
   *
   * @param {File}     file     Raw File from the file input
   * @param {Function} callback Called with { grade, confidence, heatmapUrl, recommendation, screeningId, raw }
   * @returns {Promise<void>}
   */
  async function analyzeImage(file, callback) {
    const url = (window.NETRA_CONFIG && window.NETRA_CONFIG.screenUrl) || '';
    if (!url) {
      console.warn('[NETRA] screenUrl not configured — falling back to simulation.');
      simulateAnalysis(null, callback);
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — browser sets it with the correct multipart boundary.
    });

    if (!response.ok) {
      throw new Error(`Screen API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    const data    = normalizeN8nResponse(rawData);

    // class_id (0–4) → NETRA grade key
    const CLASS_ID_TO_GRADE = ['none', 'mild', 'moderate', 'severe', 'proliferative'];
    const grade = (data.class_id !== null && CLASS_ID_TO_GRADE[data.class_id])
      ? CLASS_ID_TO_GRADE[data.class_id]
      : 'none';

    // Confidence: 0–1 float → 0–100 integer
    let confidence = parseFloat(data.confidence ?? 0);
    if (confidence <= 1) confidence = Math.round(confidence * 100);
    confidence = Math.min(100, Math.max(0, Math.round(confidence)));

    const heatmapUrl     = data.heatmap_url || null;
    const recommendation = (data.referral && (data.referral.recommendation || data.referral.reason))
      ? (data.referral.recommendation || data.referral.reason)
      : null;
    const screeningId    = data.screening_id || null;

    callback({ grade, confidence, heatmapUrl, recommendation, screeningId, raw: data });
  }

  // ── Generate canvas heatmap overlay (fallback) ────────────────
  function generateHeatmap(imgSrc, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Overlay a warm Grad-CAM–style radial gradient
      const cx = img.width * 0.55;
      const cy = img.height * 0.48;
      const r  = img.width * 0.3;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0,    'rgba(255, 60, 0, 0.6)');
      grad.addColorStop(0.3,  'rgba(255, 160, 0, 0.4)');
      grad.addColorStop(0.65, 'rgba(255, 255, 0, 0.18)');
      grad.addColorStop(1,    'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, img.width, img.height);

      // Second spot (optic disc area)
      const cx2 = img.width * 0.38;
      const cy2 = img.height * 0.46;
      const r2  = img.width * 0.14;
      const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
      grad2.addColorStop(0,   'rgba(200, 50, 200, 0.4)');
      grad2.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, img.width, img.height);

      callback(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = imgSrc;
  }


  // ═══════════════════════════════════════════════════════════════
  // REFERRAL QUEUE — API Service Layer
  // ═══════════════════════════════════════════════════════════════

  /**
   * @typedef {Object} ReferralQueueItem
   * @property {string} screening_id
   * @property {string} prediction
   * @property {number} confidence
   * @property {string} triage_decision
   * @property {string} severity
   * @property {string} priority
   * @property {string} action
   * @property {string} reason
   * @property {string} status
   * @property {string} created_at
   */

  // ── Referral Queue (n8n API + Fallback) ─────────────────────

  /** Fallback referral queue items if n8n endpoint is not yet live */
  function getFallbackReferralQueue() {
    // Generate referrals from existing screenings with referral grades
    const seed = [
      {
        screening_id: 'DR-2026-00125',
        patient_name: 'Lakshmi Devi',
        priority: 'URGENT',
        confidence: 0.96,
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        prediction: 'Proliferative Diabetic Retinopathy',
        severity: 'Proliferative',
        triage_decision: 'URGENT REFERRAL',
        status: 'PENDING_REFERRAL',
        action: 'URGENT_REFERRAL',
        reason: 'High-risk proliferative neovascularization detected'
      },
      {
        screening_id: 'DR-2026-00124',
        patient_name: 'Arvind Kumar',
        priority: 'HIGH',
        confidence: 0.91,
        created_at: new Date(Date.now() - 7 * 3600000).toISOString(),
        prediction: 'Severe NPDR',
        severity: 'Severe',
        triage_decision: 'PRIORITIZED SPECIALIST EVALUATION',
        status: 'PENDING_REFERRAL',
        action: 'PRIORITIZED_OPHTHALMOLOGIST_REVIEW',
        reason: 'Multiple blot hemorrhages and cotton wool spots'
      },
      {
        screening_id: 'DR-2026-00123',
        patient_name: 'Meena Krishnan',
        priority: 'MEDIUM',
        confidence: 0.87,
        created_at: new Date(Date.now() - 22 * 3600000).toISOString(),
        prediction: 'Moderate NPDR',
        severity: 'Moderate',
        triage_decision: 'OPHTHALMIC EVALUATION',
        status: 'PENDING_REFERRAL',
        action: 'OPHTHALMOLOGIST_REVIEW',
        reason: 'Moderate diabetic retinopathy detected'
      },
      {
        screening_id: 'DR-2026-00122',
        patient_name: 'Sunita Sharma',
        priority: 'LOW',
        confidence: 0.79,
        created_at: new Date(Date.now() - 44 * 3600000).toISOString(),
        prediction: 'Mild NPDR',
        severity: 'Mild',
        triage_decision: 'ANNUAL FOLLOW-UP',
        status: 'PENDING_FOLLOW_UP',
        action: 'FOLLOW_UP_RECOMMENDED',
        reason: 'Microaneurysms detected; follow-up in 6–12 months'
      },
    ];

    // Merge any user-screened items that required referral
    const local = getScreenings().filter(s => ['moderate', 'severe', 'proliferative'].includes(s.grade));
    const merged = [...seed];
    local.forEach(s => {
      if (!merged.some(m => m.screening_id === s.id)) {
        const isUrgent = s.grade === 'proliferative';
        const isHigh = s.grade === 'severe';
        merged.unshift({
          screening_id: s.id,
          patient_name: s.patientName || 'Patient',
          priority: isUrgent ? 'URGENT' : isHigh ? 'HIGH' : 'MEDIUM',
          confidence: (s.confidence || 90) / 100,
          created_at: s.date ? new Date(s.date).toISOString() : new Date().toISOString(),
          prediction: s.grade.toUpperCase() + ' DR',
          severity: s.grade.charAt(0).toUpperCase() + s.grade.slice(1),
          triage_decision: isUrgent ? 'URGENT REFERRAL' : 'SPECIALIST REVIEW',
          status: 'PENDING_REFERRAL',
          action: isUrgent ? 'URGENT_REFERRAL' : 'OPHTHALMOLOGIST_REVIEW',
          reason: `${s.grade.charAt(0).toUpperCase() + s.grade.slice(1)} diabetic retinopathy detected`
        });
      }
    });
    return merged;
  }

  /**
   * Fetch the Referral Queue from the configured n8n webhook endpoint.
   * If the endpoint is not yet configured or fails, falls back gracefully.
   * @returns {Promise<ReferralQueueItem[]>}
   */
  async function getReferralQueue() {
    const url = (window.NETRA_CONFIG && window.NETRA_CONFIG.referralQueueUrl) || '';
    if (!url) {
      return getFallbackReferralQueue();
    }
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`n8n response status: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      // Accept either a top-level array or { data: [...] } or { items: [...] }
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.items)) return data.items;
      return [];
    } catch (err) {
      console.warn('[NETRA] Live n8n referral queue fetch unavailable, falling back:', err.message);
      return getFallbackReferralQueue();
    }
  }

  // ── Label Formatters ──────────────────────────────────────────

  /** Human-readable status labels from backend values */
  const STATUS_LABELS = {
    PENDING_REFERRAL:    'Pending Referral',
    PENDING_FOLLOW_UP:   'Pending Follow-up',
    PENDING_HUMAN_REVIEW:'Human Review Required',
    COMPLETED:           'Completed',
    CANCELLED:           'Cancelled',
    IN_PROGRESS:         'In Progress',
  };

  /** Human-readable action labels from backend values */
  const ACTION_LABELS = {
    ROUTINE_SCREENING:                   'Routine Screening',
    FOLLOW_UP_RECOMMENDED:               'Follow-up Recommended',
    OPHTHALMOLOGIST_REVIEW:              'Ophthalmologist Review',
    PRIORITIZED_OPHTHALMOLOGIST_REVIEW:  'Prioritized Ophthalmologist Review',
    MANUAL_REVIEW:                       'Manual Review',
    URGENT_REFERRAL:                     'Urgent Referral',
  };

  /**
   * Format a backend status value to human-readable text.
   * Falls back to title-casing the raw value if not in the map.
   * @param {string} status
   * @returns {string}
   */
  function formatStatus(status) {
    if (!status) return '—';
    return STATUS_LABELS[status.toUpperCase()] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Format a backend action value to human-readable text.
   * @param {string} action
   * @returns {string}
   */
  function formatAction(action) {
    if (!action) return '—';
    return ACTION_LABELS[action.toUpperCase()] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Return a CSS class suffix for the priority badge.
   * Based solely on the backend `priority` field — no medical inference.
   * @param {string} priority
   * @returns {string}
   */
  function priorityClass(priority) {
    const map = {
      URGENT: 'urgent',
      HIGH:   'high',
      MEDIUM: 'medium',
      LOW:    'low',
      REVIEW: 'review',
    };
    return map[(priority || '').toUpperCase()] || 'low';
  }

  return {
    requireAuth, getUser, logout, initSidebar,
    GRADES, gradeInfo, badgeHTML, recommendation,
    getScreenings, saveScreenings, addScreening, getScreeningById,
    formatDate, simulateAnalysis, normalizeN8nResponse, analyzeImage, generateHeatmap,
    getReferralQueue, formatStatus, formatAction, priorityClass,
  };
})();
