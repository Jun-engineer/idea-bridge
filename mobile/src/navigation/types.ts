export type RootStackParamList = {
  Home: undefined;
  IdeaDetail: { ideaId: string };
  SubmitIdea: undefined;
  SubmitApp: { ideaId?: string };
  Profile: { role: "developer" | "idea-creator"; id: string };
};
