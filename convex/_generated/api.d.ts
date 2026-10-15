/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as aiProvider from "../aiProvider.js";
import type * as artifactBenchmarkCatalog from "../artifactBenchmarkCatalog.js";
import type * as artifactCi from "../artifactCi.js";
import type * as artifactCiActions from "../artifactCiActions.js";
import type * as artifactCiProvenance from "../artifactCiProvenance.js";
import type * as artifactCiValidators from "../artifactCiValidators.js";
import type * as artifactQuality from "../artifactQuality.js";
import type * as artifactTestPlan from "../artifactTestPlan.js";
import type * as artifactTests from "../artifactTests.js";
import type * as artifacts from "../artifacts.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as benchmarkProvenance from "../benchmarkProvenance.js";
import type * as benchmarks from "../benchmarks.js";
import type * as claimedEffects from "../claimedEffects.js";
import type * as councilMemoryCandidate from "../councilMemoryCandidate.js";
import type * as councilMemoryModel from "../councilMemoryModel.js";
import type * as delivery from "../delivery.js";
import type * as deliveryEvidence from "../deliveryEvidence.js";
import type * as exclusiveWork from "../exclusiveWork.js";
import type * as executionClaims from "../executionClaims.js";
import type * as executionReview from "../executionReview.js";
import type * as forge from "../forge.js";
import type * as http from "../http.js";
import type * as incidentParser from "../incidentParser.js";
import type * as incidentSafety from "../incidentSafety.js";
import type * as incidents from "../incidents.js";
import type * as intelligenceOrchestrator from "../intelligenceOrchestrator.js";
import type * as intentContract from "../intentContract.js";
import type * as learningEngine from "../learningEngine.js";
import type * as manifestIntelligence from "../manifestIntelligence.js";
import type * as manifestStrategyParser from "../manifestStrategyParser.js";
import type * as memory from "../memory.js";
import type * as missionRunner from "../missionRunner.js";
import type * as missionSources from "../missionSources.js";
import type * as missions from "../missions.js";
import type * as orchestration from "../orchestration.js";
import type * as permissions from "../permissions.js";
import type * as portfolio from "../portfolio.js";
import type * as productEvidenceImport from "../productEvidenceImport.js";
import type * as productOutcomeModel from "../productOutcomeModel.js";
import type * as providerAccounting from "../providerAccounting.js";
import type * as providerClaimFence from "../providerClaimFence.js";
import type * as providerHealth from "../providerHealth.js";
import type * as providerRecovery from "../providerRecovery.js";
import type * as providerUsage from "../providerUsage.js";
import type * as providerUsageModel from "../providerUsageModel.js";
import type * as readiness from "../readiness.js";
import type * as research from "../research.js";
import type * as researchData from "../researchData.js";
import type * as siteTraffic from "../siteTraffic.js";
import type * as siteTrafficModel from "../siteTrafficModel.js";
import type * as unstartedRetry from "../unstartedRetry.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  aiProvider: typeof aiProvider;
  artifactBenchmarkCatalog: typeof artifactBenchmarkCatalog;
  artifactCi: typeof artifactCi;
  artifactCiActions: typeof artifactCiActions;
  artifactCiProvenance: typeof artifactCiProvenance;
  artifactCiValidators: typeof artifactCiValidators;
  artifactQuality: typeof artifactQuality;
  artifactTestPlan: typeof artifactTestPlan;
  artifactTests: typeof artifactTests;
  artifacts: typeof artifacts;
  audit: typeof audit;
  auth: typeof auth;
  benchmarkProvenance: typeof benchmarkProvenance;
  benchmarks: typeof benchmarks;
  claimedEffects: typeof claimedEffects;
  councilMemoryCandidate: typeof councilMemoryCandidate;
  councilMemoryModel: typeof councilMemoryModel;
  delivery: typeof delivery;
  deliveryEvidence: typeof deliveryEvidence;
  exclusiveWork: typeof exclusiveWork;
  executionClaims: typeof executionClaims;
  executionReview: typeof executionReview;
  forge: typeof forge;
  http: typeof http;
  incidentParser: typeof incidentParser;
  incidentSafety: typeof incidentSafety;
  incidents: typeof incidents;
  intelligenceOrchestrator: typeof intelligenceOrchestrator;
  intentContract: typeof intentContract;
  learningEngine: typeof learningEngine;
  manifestIntelligence: typeof manifestIntelligence;
  manifestStrategyParser: typeof manifestStrategyParser;
  memory: typeof memory;
  missionRunner: typeof missionRunner;
  missionSources: typeof missionSources;
  missions: typeof missions;
  orchestration: typeof orchestration;
  permissions: typeof permissions;
  portfolio: typeof portfolio;
  productEvidenceImport: typeof productEvidenceImport;
  productOutcomeModel: typeof productOutcomeModel;
  providerAccounting: typeof providerAccounting;
  providerClaimFence: typeof providerClaimFence;
  providerHealth: typeof providerHealth;
  providerRecovery: typeof providerRecovery;
  providerUsage: typeof providerUsage;
  providerUsageModel: typeof providerUsageModel;
  readiness: typeof readiness;
  research: typeof research;
  researchData: typeof researchData;
  siteTraffic: typeof siteTraffic;
  siteTrafficModel: typeof siteTrafficModel;
  unstartedRetry: typeof unstartedRetry;
  users: typeof users;
  verification: typeof verification;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
