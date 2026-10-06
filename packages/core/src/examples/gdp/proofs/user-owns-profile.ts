import { defineProof, type Named, type Proof } from "@gdp-ts/core";
import { Option } from "effect";
import type { RegisteredUser, UserId } from "../../../domain/registration";

const userOwnsProfileProver = defineProof("UserOwnsProfile");

interface UserOwnsProfile<ViewerName, ProfileName> extends Proof<
  "UserOwnsProfile",
  [ViewerName, ProfileName]
> {
  readonly __proofKind?: "UserOwnsProfile";
}

function userOwnsProfile<ViewerName, ProfileName>(
  viewer: Named<ViewerName, UserId>,
  profile: Named<ProfileName, RegisteredUser>,
): Option.Option<UserOwnsProfile<ViewerName, ProfileName>> {
  if (viewer.value !== profile.value.id) {
    return Option.none();
  }
  return Option.some(userOwnsProfileProver.prove(viewer, profile));
}

export { userOwnsProfile };
export type { UserOwnsProfile };
