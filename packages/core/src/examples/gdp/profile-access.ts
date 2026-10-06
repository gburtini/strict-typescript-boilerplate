import { name } from "@gdp-ts/core";
import { Option } from "effect";
import { readPrivateProfileEmail } from "./read-private-profile-email";
import { userOwnsProfile } from "./proofs/user-owns-profile";
import { registeredUserSchema, userIdSchema } from "../../domain/registration";

function readOwnProfileEmail(
  authenticatedUserId: string,
  profileInput: unknown,
): Option.Option<string> {
  const viewerId = userIdSchema.parse(authenticatedUserId);
  const profile = registeredUserSchema.parse(profileInput);
  return name(viewerId, profile, (viewer, namedProfile) =>
    Option.map(userOwnsProfile(viewer, namedProfile), (proof) =>
      readPrivateProfileEmail(namedProfile, proof),
    ),
  );
}

export { readOwnProfileEmail };
