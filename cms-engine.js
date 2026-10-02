// ─────────────────────────────────────────────────────────
// Noble Hart Blog Post Engine
// Runs on every CMS-generated post page. Expects three globals to
// already be defined by an inline <script> before this file loads:
//   CMS_API_URL   — this CMS's public Web App URL (baked in at
//                   generation time — see GithubPublish.gs)
//   CONTENT_TYPE  — "Article" (or "Book"/"Freebie" if reused later)
//   CONTENT_ID    — the record's ID, e.g. "ART001"
// ─────────────────────────────────────────────────────────

(function () {
  if (typeof CMS_API_URL === "undefined" || typeof CONTENT_ID === "undefined") return;

  const postBody = document.getElementById("postBody");
  const likeBtn = document.getElementById("likeBtn");
  const likeCountEl = document.getElementById("likeCount");
  const commentList = document.getElementById("commentList");
  const commentForm = document.getElementById("commentForm");
  const commentStatus = document.getElementById("commentStatus");

  const LIKED_KEY = "nh_liked_" + CONTENT_TYPE + "_" + CONTENT_ID;

  // cms-site.js (loaded on the same page) owns the actual token; fall
  // back to an empty string if it's unavailable for any reason — the
  // server just treats that as one shared "anonymous" bucket.
  function visitorToken() {
    return (typeof NobleHartCMS !== "undefined" && NobleHartCMS.getVisitorToken) ? NobleHartCMS.getVisitorToken() : "";
  }

  // Resolves to an empty string if reCAPTCHA isn't configured — the
  // server-side check degrades the same way, so this never blocks a
  // real action just because the site owner hasn't set it up.
  function recaptchaToken(action) {
    return (typeof NobleHartCMS !== "undefined" && NobleHartCMS.getRecaptchaToken)
      ? NobleHartCMS.getRecaptchaToken(action)
      : Promise.resolve("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Deterministic, brand-consistent avatar colors — same name always
  // gets the same color, no images or emails needed.
  const AVATAR_COLORS = ["#17365D", "#0d2747", "#5f7d58", "#8a6a1f", "#3f5c78", "#8a4a4a"];
  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  function avatarInitial(name) {
    const trimmed = (name || "").trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  }

  // ---- Article body (fetched at runtime, not baked in, since only
  // meta tags need to exist before JS runs for Pinterest's sake) ----
  if (postBody) {
    fetch(`${CMS_API_URL}?action=article&id=${encodeURIComponent(CONTENT_ID)}`)
      .then((res) => res.json())
      .then((article) => {
        postBody.innerHTML = article && article.Content ? article.Content : "<p>This article could not be loaded.</p>";
      })
      .catch(() => {
        postBody.innerHTML = "<p>This article could not be loaded right now. Please try again later.</p>";
      });
  }

  // ---- Likes + comments ----
  function renderComments(comments) {
    if (!commentList) return;
    if (!comments || comments.length === 0) {
      commentList.innerHTML = '<p class="comment-empty">Be the first to leave a comment.</p>';
      return;
    }
    commentList.innerHTML = comments
      .map((c) => {
        const name = c.Name || "Anonymous";
        return `
        <div class="comment-item">
          <div class="comment-avatar" style="background:${avatarColor(name)}">${escapeHtml(avatarInitial(name))}</div>
          <div class="comment-content">
            <div class="comment-head">
              <strong>${escapeHtml(name)}</strong>
              <time>${formatDate(c.Created_Date)}</time>
            </div>
            <p>${escapeHtml(c.Comment_Text || "")}</p>
          </div>
        </div>`;
      })
      .join("");
  }

  function loadEngagement() {
    fetch(`${CMS_API_URL}?action=engagement&contentType=${encodeURIComponent(CONTENT_TYPE)}&contentId=${encodeURIComponent(CONTENT_ID)}`)
      .then((res) => res.json())
      .then((data) => {
        if (likeCountEl) likeCountEl.textContent = data.likes || 0;
        renderComments(data.comments);
      })
      .catch(() => {
        if (commentList) commentList.innerHTML = '<p class="comment-empty">Comments are unavailable right now.</p>';
      });
  }

  if (likeBtn) {
    if (localStorage.getItem(LIKED_KEY)) {
      likeBtn.classList.add("liked");
      likeBtn.querySelector(".like-label").textContent = "Liked";
    }

    likeBtn.addEventListener("click", function () {
      if (localStorage.getItem(LIKED_KEY)) return;
      likeBtn.disabled = true;

      recaptchaToken("like")
        .then(function (token) {
          return fetch(CMS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "like", contentType: CONTENT_TYPE, contentId: CONTENT_ID, visitorToken: visitorToken(), recaptchaToken: token }),
          });
        })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.error) throw new Error(data.error);
          if (likeCountEl && typeof data.likes !== "undefined") likeCountEl.textContent = data.likes;
          likeBtn.classList.add("liked");
          likeBtn.querySelector(".like-label").textContent = "Liked";
          localStorage.setItem(LIKED_KEY, "1");
        })
        .catch(() => {})
        .finally(() => {
          likeBtn.disabled = false;
        });
    });
  }

  if (commentForm) {
    commentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = commentForm.elements["name"].value.trim();
      const comment = commentForm.elements["comment"].value.trim();
      const honeypot = commentForm.elements["website"].value;

      if (honeypot) return;

      if (!name || !comment) {
        commentStatus.textContent = "Please fill in your name and comment.";
        commentStatus.className = "comment-status error";
        return;
      }

      const submitBtn = commentForm.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      commentStatus.textContent = "Posting your comment...";
      commentStatus.className = "comment-status";

      recaptchaToken("comment")
        .then(function (token) {
          return fetch(CMS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "comment",
              contentType: CONTENT_TYPE,
              contentId: CONTENT_ID,
              name,
              comment,
              website: honeypot,
              visitorToken: visitorToken(),
              recaptchaToken: token,
            }),
          });
        })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.error) throw new Error(data.error);
          commentStatus.textContent = "Thanks! Your comment is live.";
          commentStatus.className = "comment-status success";
          commentForm.reset();
          loadEngagement(); // refresh so the new comment appears right away
        })
        .catch((err) => {
          commentStatus.textContent = (err && err.message) || "Something went wrong. Please try again.";
          commentStatus.className = "comment-status error";
        })
        .finally(() => {
          submitBtn.disabled = false;
        });
    });
  }

  loadEngagement();
})();
