"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import { ONBOARDING_TOUR_STEPS, type TourStep } from "./tour-steps";

interface OnboardingTourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  isAdmin: boolean;
  startTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

const STORAGE_PREFIX = "energivia_tour_completed_";

export function useOnboardingTour(): OnboardingTourContextValue {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) {
    throw new Error("useOnboardingTour must be used within an OnboardingTourProvider");
  }
  return ctx;
}

export function OnboardingTourProvider({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const { user, currentOrganization } = useOrganization();

  // O tour fica liberado SOMENTE para administradores nesta fase inicial
  const isAdmin = useMemo(() => {
    const roleOrg = currentOrganization?.role;
    const roleUser = user?.role;
    return roleOrg === "ADMIN" || roleOrg === "OWNER" || roleUser === "ADMIN";
  }, [currentOrganization?.role, user?.role]);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [hasCheckedAutoStart, setHasCheckedAutoStart] = useState(false);

  const storageKey = useMemo(() => {
    const identifier = user?.id || user?.email || "default_user";
    return `${STORAGE_PREFIX}${identifier}`;
  }, [user?.id, user?.email]);

  const totalSteps = ONBOARDING_TOUR_STEPS.length;
  const currentStep = useMemo(() => {
    if (!isActive || currentStepIndex < 0 || currentStepIndex >= totalSteps) return null;
    return ONBOARDING_TOUR_STEPS[currentStepIndex] ?? null;
  }, [isActive, currentStepIndex, totalSteps]);

  const startTour = useCallback(() => {
    if (!isAdmin) return;
    setCurrentStepIndex(0);
    setIsActive(true);
  }, [isAdmin]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // Ignora erros de localStorage restrito
      }
    }
  }, [storageKey]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSteps) {
        skipTour();
        return;
      }
      setCurrentStepIndex(index);

      // Dispara ações para abrir modais correspondentes quando a etapa requisitar
      const targetStep = ONBOARDING_TOUR_STEPS[index];
      if (typeof window !== "undefined" && targetStep?.requiresModal) {
        window.dispatchEvent(
          new CustomEvent("energivia_tour_modal_action", {
            detail: { requiredModal: targetStep.requiresModal, stepId: targetStep.id },
          })
        );
      }
    },
    [totalSteps, skipTour]
  );

  const nextStep = useCallback(() => {
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep]);

  // Auto-start no primeiro acesso do admin após carregar o dashboard
  useEffect(() => {
    if (typeof window === "undefined" || hasCheckedAutoStart) return;
    if (!isAdmin || !user) return;

    // Apenas auto-inicia nas rotas do painel/dashboard
    const isDashboard = pathname === "/" || pathname === "/painel" || pathname === "/dashboard";
    if (!isDashboard) return;

    try {
      const alreadyCompleted = localStorage.getItem(storageKey) === "true";
      if (!alreadyCompleted) {
        const timer = setTimeout(() => {
          startTour();
          setHasCheckedAutoStart(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignora erro de acesso a storage
    }
    setHasCheckedAutoStart(true);
  }, [isAdmin, user, pathname, storageKey, hasCheckedAutoStart, startTour]);

  // Listener para acionar o tour programaticamente de qualquer lugar (ex: menu de perfil)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleTrigger = () => {
      startTour();
    };
    window.addEventListener("energivia_trigger_onboarding_tour", handleTrigger);
    return () => {
      window.removeEventListener("energivia_trigger_onboarding_tour", handleTrigger);
    };
  }, [startTour]);

  const value = useMemo(
    () => ({
      isActive,
      currentStepIndex,
      currentStep,
      totalSteps,
      isAdmin,
      startTour,
      skipTour,
      nextStep,
      prevStep,
      goToStep,
    }),
    [
      isActive,
      currentStepIndex,
      currentStep,
      totalSteps,
      isAdmin,
      startTour,
      skipTour,
      nextStep,
      prevStep,
      goToStep,
    ]
  );

  return <OnboardingTourContext.Provider value={value}>{children}</OnboardingTourContext.Provider>;
}
