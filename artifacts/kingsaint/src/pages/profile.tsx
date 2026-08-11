import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateProfile, useChangePassword } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { UserCircle, KeyRound } from "lucide-react";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  country: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      country: user?.country ?? "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const profileMutation = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Profile updated", description: "Your details have been saved." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const passwordMutation = useChangePassword({
    mutation: {
      onSuccess: () => {
        passwordForm.reset();
        toast({ title: "Password changed", description: "Your new password is active." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and security.</p>
      </div>

      {/* Avatar block */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardContent className="py-6 flex items-center gap-6">
          <Avatar className="h-16 w-16 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-serif">
              {user?.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium text-lg">{user?.fullName}</p>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            <p className="text-xs text-primary uppercase tracking-wider mt-1 capitalize">{user?.role} Account</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-white flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" /> Personal Information
            </CardTitle>
            <CardDescription>Update your name, phone, and country.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(v => profileMutation.mutate({ data: v }))} className="space-y-5">
                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Full Name</FormLabel>
                      <FormControl>
                        <Input className="bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 555 000 0000" className="bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" className="bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground rounded-sm" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Password form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Change Password
            </CardTitle>
            <CardDescription>Use a strong password with at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(v => passwordMutation.mutate({ data: v }))} className="space-y-5">
                {(["currentPassword", "newPassword", "confirmPassword"] as const).map((name) => (
                  <FormField
                    key={name}
                    control={passwordForm.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">
                          {name === "currentPassword" ? "Current Password" : name === "newPassword" ? "New Password" : "Confirm New Password"}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button type="submit" className="bg-primary text-primary-foreground rounded-sm" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
