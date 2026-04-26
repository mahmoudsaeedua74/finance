"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function GoalManager() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const create = useMutation({
    mutationFn: () =>
      jsonFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({ name, targetAmount: Number(targetAmount) }),
      }),
    onSuccess: () => {
      toast.success("Goal created");
      setName("");
      setTargetAmount("");
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create goal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name" className="h-10" />
        <Input
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="Target amount"
          className="h-10"
        />
        <Button type="button" className="h-10" disabled={!name || !targetAmount || create.isPending} onClick={() => create.mutate()}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
