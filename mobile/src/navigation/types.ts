export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  VerifyContact:
    | {
        requestId?: string;
        verification?: import("../types").VerificationChallenge;
      }
    | undefined;
  Home: undefined;
  IdeaDetail: { ideaId: string };
  SubmitIdea: undefined;
  SubmitApp: { ideaId?: string };
  Profile: { role: "developer" | "idea-creator"; id: string };
};
