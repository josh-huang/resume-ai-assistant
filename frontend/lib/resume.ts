import rawResume from "../data/resume.generated.json";

type RawResume = typeof rawResume;

export type ResumeSectionLink = { id: string; label: string };

export type ResumeData = {
  basics: {
    name: string;
    email: string;
    phone: string;
    linkedIn: string;
    linkedInUrl: string;
    github: string;
  };
  profile: string;
  education: Array<{ school: string; period: string; detail: string }>;
  experience: Array<{
    role: string;
    org: string;
    period: string;
    bullets: string[];
  }>;
  projects: Array<{
    title: string;
    context?: string;
    period: string;
    bullets: string[];
  }>;
  skills: Array<{ label: string; value: string }>;
  certifications: string[];
};

const resumeData: ResumeData = buildResumeData(rawResume);

export { resumeData };

function buildResumeData(raw: RawResume): ResumeData {
  const profile = (raw.sections.profile ?? []).join(" ");
  const contact = parseContact(raw.contact ?? "");

  return {
    basics: {
      name: raw.name ?? "Huang Jiashu",
      email: contact.email,
      phone: contact.phone,
      linkedIn: contact.linkedIn,
      linkedInUrl: contact.linkedInUrl,
      github: contact.github,
    },
    profile,
    education: parseEducation(raw.sections.education ?? []),
    experience: parseExperience(raw.sections.experience ?? []),
    projects: parseProjects(raw.sections.projects ?? []),
    skills: parseSkills(raw.sections.skills ?? []),
    certifications: raw.sections.certifications ?? [],
  };
}

function normalizeSpaces(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function splitTitlePeriod(line: string): { title: string; period: string } {
  const cleanLine = line.replace(/\u00a0/g, " ");
  const match = cleanLine.match(/^(.*?)(?:\s{2,}|\t+)(.+)$/);
  if (match) {
    return { title: match[1].trim(), period: match[2].trim() };
  }
  return { title: line.trim(), period: "" };
}

function parseEducation(lines: string[]) {
  const items: ResumeData["education"] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const header = lines[i] ?? "";
    const detail = lines[i + 1] ?? "";
    const { title, period } = splitTitlePeriod(header);
    items.push({
      school: title,
      period,
      detail: detail.trim(),
    });
  }
  return items;
}

function parseExperience(lines: string[]) {
  const items: ResumeData["experience"] = [];
  let currentOrg = "";
  let currentPeriod = "";
  let currentRole = "";
  let bullets: string[] = [];

  const pushCurrent = () => {
    if (!currentRole || !currentOrg) {
      return;
    }
    items.push({
      role: currentRole,
      org: currentOrg,
      period: currentPeriod,
      bullets: bullets.map((line) => normalizeSpaces(line)),
    });
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const { title, period } = splitTitlePeriod(trimmed);
    if (period) {
      // New experience entry
      if (currentRole) {
        pushCurrent();
      }
      currentOrg = title;
      currentPeriod = period;
      currentRole = "";
      bullets = [];
      return;
    }

    if (!currentRole) {
      currentRole = trimmed;
      return;
    }

    bullets.push(trimmed);
  });

  if (currentRole) {
    pushCurrent();
  }

  return items;
}

function parseProjects(lines: string[]) {
  const items: ResumeData["projects"] = [];
  let currentContext = "";
  let currentProject: ResumeData["projects"][number] | null = null;

  const pushCurrent = () => {
    if (currentProject) {
      currentProject.bullets = currentProject.bullets.map((line) =>
        normalizeSpaces(line)
      );
      items.push(currentProject);
      currentProject = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const { title, period } = splitTitlePeriod(trimmed);
    if (period) {
      pushCurrent();
      currentProject = {
        title,
        period,
        context: currentContext || undefined,
        bullets: [],
      };
      return;
    }

    if (!currentProject) {
      currentContext = trimmed;
      return;
    }

    currentProject.bullets.push(trimmed);
  });

  pushCurrent();

  return items;
}

function parseSkills(lines: string[]) {
  return lines.map((line) => {
    const [label, ...rest] = line.split(":");
    return {
      label: (label ?? "").trim(),
      value: rest.join(":").trim(),
    };
  });
}

function parseContact(contactLine: string) {
  const normalized = contactLine.replace("|GitHub", "| GitHub");
  const parts = normalized.split("|").map((part) => part.trim());
  const map: Record<string, string> = {};

  parts.forEach((part) => {
    const [label, ...rest] = part.split(":");
    if (!label) {
      return;
    }
    map[label.toLowerCase().replace(/\s+/g, "_")] = rest.join(":").trim();
  });

  const linkedInValue = map["linkedin"] ?? "";

  return {
    email: map["email"] ?? "",
    phone: map["contact_number"] ?? "",
    linkedIn: linkedInValue,
    linkedInUrl: buildLinkedInUrl(linkedInValue),
    github: buildGithubUrl(map["github"] ?? ""),
  };
}

function buildLinkedInUrl(value: string) {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
  return `https://www.linkedin.com/in/${slug}`;
}

function buildGithubUrl(value: string) {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const handle = trimmed.replace(/^@/, "");
  return `https://github.com/${handle}`;
}

