"use strict";

function indent(text, spaces = 2) {
  const pad = " ".repeat(spaces);
  return String(text)
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

function comma(n) {
  if (n == null || n === "") return null;
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString("en-US");
}

function line(...parts) {
  return parts.filter((part) => part != null && part !== "").join("  ");
}

function empty(label) {
  return `No ${label}.`;
}

function formatCompetitors(data) {
  const competitors = (data && data.competitors) || [];
  if (competitors.length === 0) return empty("tracked competitors");

  const lines = [`Tracked competitors (${data.count != null ? data.count : competitors.length})`, ""];
  for (const row of competitors) {
    const tag = row.is_own ? "you" : null;
    lines.push(`  ${line(row.competitor || "—", tag, row.domain)}`);
    const seo = row.seo;
    if (seo) {
      const bits = [];
      if (seo.domain_rating != null) bits.push(`DR ${seo.domain_rating}`);
      if (seo.organic_keywords != null) bits.push(`${comma(seo.organic_keywords)} keywords`);
      if (seo.estimated_monthly_organic_traffic != null) {
        bits.push(`~${comma(seo.estimated_monthly_organic_traffic)} monthly organic`);
      }
      if (bits.length) lines.push(`    ${bits.join(" · ")}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function formatListItems(items, render) {
  if (!items || items.length === 0) return [];
  return items.flatMap((item) => render(item));
}

function formatBattlecard(data) {
  if (!data || typeof data !== "object") return String(data);
  const card = data.battlecard || {};
  const lines = [
    line(data.competitor, data.domain),
    data.generated_at ? `Generated ${data.generated_at}` : null,
    data.stale_angles && data.stale_angles.length
      ? `Stale angles: ${data.stale_angles.join(", ")}`
      : null,
    ""
  ].filter((row) => row != null);

  if (card.overview) {
    lines.push("Overview", indent(card.overview), "");
  }

  if (Array.isArray(card.quick_stats) && card.quick_stats.length) {
    lines.push("Quick stats");
    for (const stat of card.quick_stats) {
      lines.push(`  ${stat.label || "—"}  ${stat.value || ""}`);
    }
    lines.push("");
  }

  const sections = [
    ["Strengths", card.strengths, (item) => [`  • ${item.point}`, item.evidence ? `    ${item.evidence}` : null]],
    ["Weaknesses", card.weaknesses, (item) => [`  • ${item.point}`, item.evidence ? `    ${item.evidence}` : null]],
    ["How you win", card.how_we_win, (item) => [`  • ${item.differentiator}`, item.talk_track ? `    ${item.talk_track}` : null]],
    ["Objection handling", card.objection_handling, (item) => [`  They say: ${item.objection || ""}`, `  You say: ${item.response || ""}`]]
  ];

  for (const [title, items, render] of sections) {
    if (!items || items.length === 0) continue;
    lines.push(title);
    lines.push(...formatListItems(items, render).filter(Boolean));
    lines.push("");
  }

  const track = card.pricing_talk_track;
  if (track && typeof track === "object" && Object.keys(track).length) {
    lines.push("Pricing talk track");
    if (track.their_pricing) lines.push(`  Theirs: ${track.their_pricing}`);
    if (track.our_position) lines.push(`  Ours: ${track.our_position}`);
    if (track.guidance) lines.push(`  ${track.guidance}`);
    lines.push("");
  }

  if (Array.isArray(card.landmines) && card.landmines.length) {
    lines.push("Landmines");
    for (const item of card.landmines) lines.push(`  • ${item}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatPricingChanges(data) {
  const changes = (data && data.changes) || [];
  if (changes.length === 0) return empty("pricing changes");

  const header = data.total != null ? `${data.total} pricing change${data.total === 1 ? "" : "s"}` : "Pricing changes";
  const lines = [header, ""];
  for (const change of changes) {
    lines.push(`  ${line(change.competitor, change.domain, change.significance, change.detected_at)}`);
    if (change.summary) lines.push(indent(change.summary, 4));
    lines.push("");
  }
  if (data.has_more) lines.push(`More available (next offset ${data.next_offset}).`);
  return lines.join("\n").trimEnd();
}

function formatReviews(data) {
  const reviews = (data && data.reviews) || [];
  const summary = (data && data.summary) || [];
  if (summary.length === 0 && reviews.length === 0) return empty("reviews");

  const lines = [];
  if (summary.length) {
    lines.push("Summary");
    for (const row of summary) {
      const rating = row.average_rating != null ? `${row.average_rating}/5` : null;
      const count = row.review_count != null ? `(${comma(row.review_count)})` : null;
      lines.push(`  ${line(row.competitor, row.source, rating, count)}`);
    }
    lines.push("");
  }

  if (reviews.length) {
    lines.push(`Reviews (${data.count != null ? data.count : reviews.length})`);
    for (const review of reviews) {
      const stars = review.rating != null ? `${review.rating}★` : null;
      lines.push(`  ${line(review.competitor, review.source, stars, review.reviewed_at)}`);
      if (review.title) lines.push(`    ${review.title}`);
      if (review.body) lines.push(indent(review.body, 4));
      if (review.url) lines.push(`    ${review.url}`);
      lines.push("");
    }
  }
  if (data.has_more) lines.push(`More available (next offset ${data.next_offset}).`);
  return lines.join("\n").trimEnd();
}

function formatNews(data) {
  const mentions = (data && data.mentions) || [];
  if (mentions.length === 0) return empty("news mentions");

  const header = data.total != null ? `${data.total} news mention${data.total === 1 ? "" : "s"}` : "News mentions";
  const lines = [header, ""];
  for (const mention of mentions) {
    lines.push(`  ${line(mention.competitor, mention.category, mention.published_at, mention.source)}`);
    if (mention.title) lines.push(`    ${mention.title}`);
    if (mention.url) lines.push(`    ${mention.url}`);
    lines.push("");
  }
  if (data.has_more) lines.push(`More available (next offset ${data.next_offset}).`);
  return lines.join("\n").trimEnd();
}

function formatActionPlans(data) {
  const plans = (data && data.plans) || [];
  if (plans.length === 0) return empty("action plans");

  const lines = [];
  plans.forEach((plan, index) => {
    const label = index === 0 ? "Current plan" : "Earlier plan";
    lines.push(`${label}${plan.generated_at ? `  (${plan.generated_at})` : ""}`);
    if (plan.summary) lines.push(indent(plan.summary), "");
    for (const item of plan.action_items || []) {
      lines.push(`  • ${item.title || "Untitled"}`);
      if (item.why_it_matters) lines.push(`    ${item.why_it_matters}`);
      if (item.next_step_30_min) lines.push(`    Next 30 min: ${item.next_step_30_min}`);
      const meta = [item.urgency && `urgency ${item.urgency}`, item.confidence != null && `confidence ${item.confidence}`, item.status && `status ${item.status}`, item.angle]
        .filter(Boolean)
        .join(" · ");
      if (meta) lines.push(`    ${meta}`);
      lines.push("");
    }
  });
  if (data.has_more) lines.push(`More available (next offset ${data.next_offset}).`);
  return lines.join("\n").trimEnd();
}

function formatJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function formatData(kind, data, asJson) {
  if (asJson) return formatJson(data).trimEnd();
  switch (kind) {
    case "competitors":
      return formatCompetitors(data);
    case "battlecard":
      return formatBattlecard(data);
    case "pricing":
      return formatPricingChanges(data);
    case "reviews":
      return formatReviews(data);
    case "news":
      return formatNews(data);
    case "action-plan":
      return formatActionPlans(data);
    default:
      return formatJson(data).trimEnd();
  }
}

module.exports = {
  formatCompetitors,
  formatBattlecard,
  formatPricingChanges,
  formatReviews,
  formatNews,
  formatActionPlans,
  formatJson,
  formatData
};
