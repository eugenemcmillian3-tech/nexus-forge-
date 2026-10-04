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
import type * as artifacts from "../artifacts.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as delivery from "../delivery.js";
import type * as forge from "../forge.js";
import type * as http from "../http.js";
import type * as incidents from "../incidents.js";
import type * as macaly from "../macaly.js";
import type * as memory from "../memory.js";
import type * as missionRunner from "../missionRunner.js";
import type * as missions from "../missions.js";
import type * as permissions from "../permissions.js";
import type * as portfolio from "../portfolio.js";
import type * as research from "../research.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  artifacts: typeof artifacts;
  audit: typeof audit;
  auth: typeof auth;
  delivery: typeof delivery;
  forge: typeof forge;
  http: typeof http;
  incidents: typeof incidents;
  macaly: typeof macaly;
  memory: typeof memory;
  missionRunner: typeof missionRunner;
  missions: typeof missions;
  permissions: typeof permissions;
  portfolio: typeof portfolio;
  research: typeof research;
  users: typeof users;
  verification: typeof verification;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
export declare const components: {};
