"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star } from "lucide-react";

interface SkillCardProps {
  skill: {
    id: string;
    title: string;
    description: string;
    category: string;
    level?: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating?: number;
    totalRatings?: number;
  };
  onRequest?: (skillId: string) => void;
}

export function SkillCard({ skill, onRequest }: SkillCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer transition-shadow hover:shadow-md"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="mb-2 line-clamp-2 text-lg font-semibold leading-tight">
                {skill.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{skill.category}</Badge>
                {skill.level && (
                  <Badge variant="outline" className="capitalize">
                    {skill.level}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={skill.userAvatar} alt={skill.userName} />
              <AvatarFallback>{skill.userName?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{skill.userName}</span>
              {skill.rating !== undefined && skill.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {skill.rating.toFixed(1)}
                    {typeof skill.totalRatings === "number" && skill.totalRatings > 0
                      ? ` (${skill.totalRatings})`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {onRequest && (
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRequest(skill.id);
              }}
            >
              Request
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{skill.title}</DialogTitle>
            <DialogDescription>
              <span className="inline-flex flex-wrap gap-2">
                <Badge variant="secondary">{skill.category}</Badge>
                {skill.level && (
                  <Badge variant="outline" className="capitalize">
                    {skill.level}
                  </Badge>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={skill.userAvatar} alt={skill.userName} />
                    <AvatarFallback>{skill.userName?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{skill.userName}</div>
                    {skill.rating !== undefined && skill.rating > 0 ? (
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span>
                          {skill.rating.toFixed(1)}
                          {typeof skill.totalRatings === "number" && skill.totalRatings > 0
                            ? ` (${skill.totalRatings} reviews)`
                            : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No reviews yet</div>
                    )}
                  </div>
                </div>

                <Button asChild variant="outline" size="sm">
                  <Link href={`/profile/${skill.userId}`}>View profile</Link>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">About this skill</h4>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {skill.description}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {onRequest && (
              <Button
                onClick={() => {
                  onRequest(skill.id);
                  setOpen(false);
                }}
              >
                Request this skill
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
