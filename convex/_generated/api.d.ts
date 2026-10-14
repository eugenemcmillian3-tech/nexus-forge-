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
import type * as artifactCi from "../artifactCi.js";
import type * as artifactCiActions from "../artifactCiActions.js";
import type * as artifactTests from "../artifactTests.js";
import type * as artifacts from "../artifacts.js";
import type * as manifestIntelligence from "../manifestIntelligence.js";
import type * as learningEngine from "../learningEngine.js";
import type * as manifestStrategyParser from "../manifestStrategyParser.js";
import type * as audit from "../audit.js";
import type * as benchmarks from "../benchmarks.js";
import type * as auth from "../auth.js";
import type * as delivery from "../delivery.js";
import type * as forge from "../forge.js";
import type * as http from "../http.js";
import type * as incidents from "../incidents.js";
import type * as intelligenceOrchestrator from "../intelligenceOrchestrator.js";
import type * as intentContract from "../intentContract.js";
import type * as macaly from "../macaly.js";
import type * as memory from "../memory.js";
import type * as missionRunner from "../missionRunner.js";
import type * as missions from "../missions.js";
import type * as orchestration from "../orchestration.js";
import type * as missionSources from "../missionSources.js";
import type * as permissions from "../permissions.js";
import type * as providerHealth from "../providerHealth.js";
import type * as portfolio from "../portfolio.js";
import type * as readiness from "../readiness.js";
import type * as research from "../research.js";
import type * as researchData from "../researchData.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

import type * as productEvidenceImport from "../productEvidenceImport.js";

import type * as siteTraffic from "../siteTraffic.js";

declare const fullApi: ApiFromModules<{
  siteTraffic: typeof siteTraffic;
  productEvidenceImport: typeof productEvidenceImport;
  ResendOTP: typeof ResendOTP;
  aiProvider: typeof aiProvider;
  artifactCi: typeof artifactCi;
  artifactCiActions: typeof artifactCiActions;
  artifactTests: typeof artifactTests;
  artifacts: typeof artifacts;
  audit: typeof audit;
  benchmarks: typeof benchmarks;
  auth: typeof auth;
  delivery: typeof delivery;
  forge: typeof forge;
  http: typeof http;
  incidents: typeof incidents;
  intelligenceOrchestrator: typeof intelligenceOrchestrator;
  intentContract: typeof intentContract;
  macaly: typeof macaly;
  manifestIntelligence: typeof manifestIntelligence;
  learningEngine: typeof learningEngine;
  manifestStrategyParser: typeof manifestStrategyParser;
  memory: typeof memory;
  missionRunner: typeof missionRunner;
  missions: typeof missions;
  orchestration: typeof orchestration;
  missionSources: typeof missionSources;
  permissions: typeof permissions;
  providerHealth: typeof providerHealth;
  portfolio: typeof portfolio;
  readiness: typeof readiness;
  research: typeof research;
  researchData: typeof researchData;
  users: typeof users;
  verification: typeof verification;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
export declare const components: {};
