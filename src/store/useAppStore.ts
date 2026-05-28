"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  brokers,
  comments,
  communityPosts,
  leads,
  listings,
  sampleHomes,
  sampleProfiles
} from "@/data/dummy";
import type {
  Comment,
  ComplexSignalCandidate,
  CommunityCategory,
  CommunityPost,
  CurrentHome,
  UserFinancialPlan,
  Lead,
  Listing,
  PrimaryGoal,
  RiskPreference,
  SwipeEvent,
  UserProfile,
  VirtualPortfolioItem
} from "@/types";
import { calculateInvestmentAmount } from "@/lib/calculations";
import { properties } from "@/data/dummy";
import { DEMO_MODE_ENABLED, demoCurrentHome, demoProfile } from "@/lib/demoSubmissionData";
import {
  firstHomeCurrentHomeDefaults,
  goalFinancialPlanDefaults,
  goalLabels,
  hasOwnedCurrentHome
} from "@/lib/userState";

interface AppState {
  profile: UserProfile;
  financialPlan: UserFinancialPlan;
  currentHome: CurrentHome;
  communityPosts: CommunityPost[];
  comments: Comment[];
  listings: Listing[];
  leads: Lead[];
  swipeEvents: SwipeEvent[];
  portfolioItems: VirtualPortfolioItem[];
  activePropertyId?: string;
  activeCandidate?: ComplexSignalCandidate;
  defaultInterestCandidate?: ComplexSignalCandidate;
  updateProfile: (profile: Partial<UserProfile>) => void;
  applyPrimaryGoal: (goal: PrimaryGoal) => void;
  updateFinancialPlan: (plan: Partial<UserFinancialPlan>) => void;
  updateCurrentHome: (home: Partial<CurrentHome>) => void;
  setActiveProperty: (propertyId: string) => void;
  setActiveCandidate: (candidate: ComplexSignalCandidate) => void;
  setDefaultInterestCandidate: (candidate?: ComplexSignalCandidate) => void;
  recordSwipe: (propertyId: string, action: SwipeEvent["action"]) => void;
  saveToPortfolio: (propertyId: string, memo?: string) => void;
  saveCandidateToPortfolio: (candidate: ComplexSignalCandidate, memo?: string) => void;
  removeFromPortfolio: (propertyId: string) => void;
  addPost: (input: {
    title: string;
    content: string;
    category: CommunityCategory;
    region?: string;
    propertyId?: string;
  }) => void;
  likePost: (postId: string) => void;
  reportPost: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  addListing: (input: {
    title: string;
    salePrice: number;
    deposit: number;
    monthlyRent: number;
    listingType: Listing["listingType"];
  }) => void;
  createLead: (propertyId: string, message: string) => void;
}

const userId = "user-1";
const PERSIST_KEY = "homepath-housing-risk-app";
const LEGACY_PERSIST_KEY = "landlord-scenario-app";

migrateLegacyPersistKey();

const initialProfile: UserProfile = DEMO_MODE_ENABLED
  ? {
      ...sampleProfiles[0],
      monthlyIncome: demoProfile.monthlyIncome,
      cashOnHand: demoProfile.cashOnHand,
      monthlySavings: demoProfile.monthlySavings,
      preferredRegions: demoProfile.preferredRegions,
      primaryGoal: "buy_home"
    }
  : sampleProfiles[0];
const initialCurrentHome: CurrentHome = DEMO_MODE_ENABLED
  ? {
      ...sampleHomes[0],
      ...firstHomeCurrentHomeDefaults(demoProfile.preferredRegions[0] ?? "대구 수성구"),
      address: "대구광역시 수성구 범어동 임차 거주",
      region: demoCurrentHome.region
    }
  : sampleHomes[0];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: initialProfile,
      financialPlan: {
        annualIncomeGrowthRate: 0.03,
        monthlySavingsGrowthRate: 0.02,
        expectedBonusPerYear: 0,
        maxComfortableMonthlyPayment: DEMO_MODE_ENABLED ? demoProfile.maxComfortableMonthlyPayment : 1_500_000,
        parentalSupport: 0,
        targetHomePrice: DEMO_MODE_ENABLED ? 1_200_000_000 : 650_000_000,
        targetRegion: DEMO_MODE_ENABLED ? demoProfile.preferredRegions[0] : "대구 수성구",
        targetHorizonYears: 5,
        targetMonthlyCashFlow: initialProfile.targetMonthlyCashFlow
      },
      currentHome: initialCurrentHome,
      communityPosts,
      comments,
      listings,
      leads,
      swipeEvents: [],
      portfolioItems: [],
      activePropertyId: properties[0]?.id,
      activeCandidate: undefined,
      defaultInterestCandidate: undefined,
      updateProfile: (profile) =>
        set((state) => {
          const nextProfile = {
            ...state.profile,
            ...profile,
            preferredRegions:
              profile.preferredRegions ?? state.profile.preferredRegions,
            updatedAt: new Date().toISOString()
          };
          const goalPatch = profile.primaryGoal
            ? buildGoalStatePatch(profile.primaryGoal, state, nextProfile)
            : {};
          return {
            ...goalPatch,
            profile: nextProfile
          };
        }),
      applyPrimaryGoal: (goal) =>
        set((state) => {
          const nextProfile = {
            ...state.profile,
            primaryGoal: goal,
            updatedAt: new Date().toISOString()
          };
          return {
            ...buildGoalStatePatch(goal, state, nextProfile),
            profile: nextProfile
          };
        }),
      updateFinancialPlan: (plan) =>
        set((state) => ({
          financialPlan: {
            ...state.financialPlan,
            ...plan
          }
        })),
      updateCurrentHome: (home) =>
        set((state) => ({
          currentHome: {
            ...state.currentHome,
            ...home,
            updatedAt: new Date().toISOString()
          }
        })),
      setActiveProperty: (propertyId) => set({ activePropertyId: propertyId }),
      setActiveCandidate: (candidate) => set({ activeCandidate: candidate, activePropertyId: candidate.id }),
      setDefaultInterestCandidate: (candidate) =>
        set((state) => {
          if (!candidate) return { defaultInterestCandidate: undefined };
          if (state.defaultInterestCandidate?.id === candidate.id) return state;
          return { defaultInterestCandidate: candidate };
        }),
      recordSwipe: (propertyId, action) =>
        set((state) => ({
          swipeEvents: [
            {
              id: `swipe-${Date.now()}`,
              userId,
              propertyId,
              action,
              createdAt: new Date().toISOString()
            },
            ...state.swipeEvents
          ]
        })),
      saveToPortfolio: (propertyId, memo = "관심 주거 후보") =>
        set((state) => {
          if (state.portfolioItems.some((item) => item.propertyId === propertyId)) {
            return state;
          }

          const property = properties.find((item) => item.id === propertyId);
          if (!property) return state;

          return {
            portfolioItems: [
              {
                id: `portfolio-${Date.now()}`,
                userId,
                propertyId,
                virtualPurchasePrice: property.salePrice,
                virtualPurchaseDate: new Date().toISOString(),
                virtualInvestmentAmount: calculateInvestmentAmount(property),
                memo,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              ...state.portfolioItems
            ]
          };
        }),
      saveCandidateToPortfolio: (candidate, memo = "실거래 단지 후보") =>
        set((state) => {
          if (state.portfolioItems.some((item) => item.complexSignalId === candidate.id)) return state;
          const price = candidate.referencePrice ?? candidate.recentMedianPrice ?? 0;
          return {
            portfolioItems: [
              {
                id: `portfolio-signal-${Date.now()}`,
                userId,
                propertyId: candidate.id,
                sourceType: "complex_signal",
                complexSignalId: candidate.id,
                complexName: candidate.complexName,
                region: candidate.region,
                lawdCode5: candidate.lawdCode5,
                areaBucket: candidate.areaBucket,
                floorBand: candidate.floorBand,
                propertyType: candidate.propertyType,
                referencePrice: price,
                referenceDate: candidate.latestTradeDate ?? new Date().toISOString(),
                reason: candidate.reasons[0],
                virtualPurchasePrice: price,
                virtualPurchaseDate: new Date().toISOString(),
                virtualInvestmentAmount: Math.max(0, price - (candidate.recentJeonseMedian ?? 0)),
                memo,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              ...state.portfolioItems
            ]
          };
        }),
      removeFromPortfolio: (propertyId) =>
        set((state) => ({
          portfolioItems: state.portfolioItems.filter((item) => item.propertyId !== propertyId)
        })),
      addPost: (input) =>
        set((state) => ({
          communityPosts: [
            {
              id: `post-${Date.now()}`,
              userId,
              propertyId: input.propertyId,
              region: input.region,
              category: input.category,
              title: input.title,
              content: input.content,
              authorBadge: "매수 대기자",
              likes: 0,
              dislikes: 0,
              commentCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            ...state.communityPosts
          ]
        })),
      likePost: (postId) =>
        set((state) => ({
          communityPosts: state.communityPosts.map((post) =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post
          )
        })),
      reportPost: (postId) =>
        set((state) => ({
          communityPosts: state.communityPosts.map((post) =>
            post.id === postId ? { ...post, dislikes: post.dislikes + 1 } : post
          )
        })),
      addComment: (postId, content) =>
        set((state) => ({
          comments: [
            {
              id: `comment-${Date.now()}`,
              postId,
              userId,
              content,
              likes: 0,
              createdAt: new Date().toISOString()
            },
            ...state.comments
          ],
          communityPosts: state.communityPosts.map((post) =>
            post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post
          )
        })),
      addListing: (input) =>
        set((state) => ({
          listings: [
            {
              id: `listing-${Date.now()}`,
              propertyId: properties[0].id,
              brokerId: brokers[0].id,
              listingType: input.listingType,
              title: input.title,
              description: "중개사 대시보드에서 등록한 MVP 더미 매물",
              salePrice: input.salePrice,
              deposit: input.deposit,
              monthlyRent: input.monthlyRent,
              status: "active",
              isAd: input.listingType === "partner",
              adPriority: input.listingType === "partner" ? 5 : 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            ...state.listings
          ]
        })),
      createLead: (propertyId, message) =>
        set((state) => ({
          leads: [
            {
              id: `lead-${Date.now()}`,
              userId,
              brokerId: brokers[0].id,
              propertyId,
              leadType: "buy_consulting",
              userBudget: state.profile.cashOnHand,
              userCash: state.profile.cashOnHand,
              userMonthlyIncome: state.profile.monthlyIncome,
              message,
              status: "new",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            ...state.leads
          ]
        }))
    }),
    {
      name: PERSIST_KEY
    }
  )
);

export { goalLabels };

export const riskLabels: Record<RiskPreference, string> = {
  stable: "안정 우선",
  balanced: "균형 검토",
  aggressive: "목표 확장"
};

function migrateLegacyPersistKey() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(PERSIST_KEY)) return;
    const legacyValue = window.localStorage.getItem(LEGACY_PERSIST_KEY);
    if (legacyValue) window.localStorage.setItem(PERSIST_KEY, legacyValue);
  } catch {
    // Persist migration is best-effort; the app can still boot with defaults.
  }
}

function buildGoalStatePatch(
  goal: PrimaryGoal,
  state: Pick<AppState, "financialPlan" | "currentHome">,
  profile: UserProfile
): Partial<Pick<AppState, "financialPlan" | "currentHome" | "activeCandidate" | "defaultInterestCandidate">> {
  const financialDefaults = goalFinancialPlanDefaults(goal, profile);
  const shouldResetToFirstHome =
    goal === "buy_home" && hasOwnedCurrentHome(state.currentHome);
  return {
    financialPlan: {
      ...state.financialPlan,
      ...financialDefaults,
      targetMonthlyCashFlow: financialDefaults.targetMonthlyCashFlow ?? state.financialPlan.targetMonthlyCashFlow
    },
    currentHome: shouldResetToFirstHome
      ? {
          ...state.currentHome,
          ...firstHomeCurrentHomeDefaults(profile.preferredRegions[0] ?? state.financialPlan.targetRegion),
          updatedAt: new Date().toISOString()
        }
      : state.currentHome,
    activeCandidate: undefined,
    defaultInterestCandidate: undefined
  };
}
