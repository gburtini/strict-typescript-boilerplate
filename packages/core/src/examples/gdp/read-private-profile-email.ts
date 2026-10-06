import type { Named } from "@gdp-ts/core";
import type { RegisteredUser } from "../../domain/registration";
import type { UserOwnsProfile } from "./proofs/user-owns-profile";

function readPrivateProfileEmail<ViewerName, ProfileName>(
  profile: Named<ProfileName, RegisteredUser>,
  _proof: UserOwnsProfile<ViewerName, ProfileName>,
): string {
  return profile.value.email;
}

export { readPrivateProfileEmail };
