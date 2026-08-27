export const PRE_ALPHA_IDS = Object.freeze({
  athlete: "11111111-1111-4111-8111-111111111111",
  otherAthlete: "22222222-2222-4222-8222-222222222222",
  guardianUser: "33333333-3333-4333-8333-333333333333",
  athleteUser: "44444444-4444-4444-8444-444444444444",
  staffUser: "55555555-5555-4555-8555-555555555555",
});

export function makeAuthenticatedUser(overrides = {}) {
  return {
    id: PRE_ALPHA_IDS.guardianUser,
    authProviderSubject: "pre-alpha-auth-subject",
    email: "guardian@example.test",
    preferredLocale: "en",
    roles: ["GUARDIAN"],
    authenticatorAssuranceLevel: "aal1",
    ...overrides,
  };
}

export function makeFamilyAccessPrismaDouble({
  guardianLink = null,
  athleteProfile = null,
} = {}) {
  const calls = {
    guardianAthleteLink: [],
    athleteProfile: [],
  };

  return {
    calls,
    prisma: {
      client: {
        guardianAthleteLink: {
          findFirst: async (input) => {
            calls.guardianAthleteLink.push(input);
            return guardianLink;
          },
        },
        athleteProfile: {
          findFirst: async (input) => {
            calls.athleteProfile.push(input);
            return athleteProfile;
          },
        },
      },
    },
  };
}

export function makeReflector(policies = {}) {
  return {
    getAllAndOverride(key) {
      return policies[key];
    },
  };
}

export function makeExecutionContext(request = { headers: {} }) {
  const handler = () => undefined;
  class TestController {}

  return {
    getClass: () => TestController,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}
