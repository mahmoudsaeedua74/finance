import type { PaymentMethod } from "@/lib/payment-method";
import type { ProjectType } from "@/lib/project-type";
import type { ProjectScopeItem } from "@/lib/project-scope";
import type { WorkPhase } from "@/lib/project-work-phase";

export type ProjectTemplateDto = {
  id: string;
  name: string;
  projectType: ProjectType;
  expectedPaymentMethod: PaymentMethod;
  workPhase: WorkPhase;
  notes: string;
  scopeItems: ProjectScopeItem[];
  isBuiltin: boolean;
};

export const BUILTIN_PROJECT_TEMPLATES: ProjectTemplateDto[] = [
  {
    id: "builtin-normal",
    name: "Normal store",
    projectType: "normal",
    expectedPaymentMethod: "cash",
    workPhase: "quote",
    notes: "",
    scopeItems: [],
    isBuiltin: true,
  },
  {
    id: "builtin-sdk",
    name: "SDK project",
    projectType: "sdk",
    expectedPaymentMethod: "cash",
    workPhase: "quote",
    notes: "",
    scopeItems: [
      { title: "SDK integration", description: "", amount: 0, complexity: "high", tech: "" },
    ],
    isBuiltin: true,
  },
  {
    id: "builtin-frontend",
    name: "Frontend",
    projectType: "frontend",
    expectedPaymentMethod: "cash",
    workPhase: "quote",
    notes: "",
    scopeItems: [
      { title: "UI implementation", description: "", amount: 0, complexity: "mid", tech: "React" },
    ],
    isBuiltin: true,
  },
  {
    id: "builtin-fullstack",
    name: "Full-stack",
    projectType: "full-stack",
    expectedPaymentMethod: "cash",
    workPhase: "quote",
    notes: "",
    scopeItems: [
      { title: "Backend API", description: "", amount: 0, complexity: "high", tech: "" },
      { title: "Frontend", description: "", amount: 0, complexity: "mid", tech: "" },
    ],
    isBuiltin: true,
  },
];
