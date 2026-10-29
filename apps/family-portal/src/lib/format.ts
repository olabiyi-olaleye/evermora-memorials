/**
 * Family-portal display copy. The pure date helpers live in `@evermora/utils`;
 * `formatDate` is re-exported here under the name the components already use.
 */
import { formatMemorialDate } from "@evermora/utils";

export { formatLifespan } from "@evermora/utils";
export const formatDate = formatMemorialDate;

export const VISIBILITY_LABEL: Record<string, string> = {
  public: "Public",
  anyone_with_link: "Anyone with the link",
  private: "Private",
};

export const VISIBILITY_HELP: Record<string, string> = {
  public: "Anyone can find and view this memorial, and it may be shared broadly.",
  anyone_with_link: "Only people who receive the memorial link can view it.",
  private: "Only approved family members can view it.",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  suspended: "Suspended",
  deleted: "Deleted",
};
