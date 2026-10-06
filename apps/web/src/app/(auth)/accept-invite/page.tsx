"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

function AcceptInviteInner() {
  const params = useSearchParams();
  const invitationId = params.get("invitationId");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    if (!invitationId) {
      toast.error("Missing invitation");
      return;
    }
    setLoading(true);
    const { error } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Could not accept invite");
      return;
    }
    toast.success("Joined workspace");
    router.push("/sites");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            Join the workspace you were invited to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={accept} disabled={loading || !invitationId}>
            {loading ? "Joining…" : "Accept invite"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteInner />
    </Suspense>
  );
}
