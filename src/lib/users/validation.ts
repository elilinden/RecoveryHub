import { z } from "zod";

import { profileRoleValues } from "@/lib/users/labels";

export const inviteUserSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().toLowerCase().min(1, "Email is required.").email("Enter a valid email address."),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(profileRoleValues, { message: "Select a role." }),
  isActive: z.string().optional(),
});

export const updateUserSchema = z.object({
  userId: z.string().trim().min(1),
  fullName: z.string().trim().min(1, "Full name is required."),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(profileRoleValues, { message: "Select a role." }),
  isActive: z.string().optional(),
});

export const userIdSchema = z.object({
  userId: z.string().trim().min(1),
});

export const setActiveStatusSchema = userIdSchema.extend({
  isActive: z.enum(["true", "false"]),
});
