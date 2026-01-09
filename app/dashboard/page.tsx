"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { SkillCard } from "@/components/skill-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Search } from "lucide-react";

const categories = ["Programming", "Design", "Marketing", "Writing", "Music", "Language", "Other"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestScheduledFor, setRequestScheduledFor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    filterSkills();
  }, [searchQuery, selectedCategory, skills]);

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSkills();
      setSkills(data);
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSkills = () => {
    let filtered = [...skills];

    if (searchQuery) {
      filtered = filtered.filter(
        (skill) =>
          skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          skill.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((skill) => skill.category === selectedCategory);
    }

    setFilteredSkills(filtered);
  };

  const handleRequestSkill = (skillId: string) => {
    setSelectedSkill(skillId);
    setRequestDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedSkill) return;

    try {
      setIsSubmitting(true);
      await api.createRequest(
        selectedSkill,
        requestMessage,
        requestScheduledFor ? new Date(requestScheduledFor).toISOString() : null
      );
      setRequestDialogOpen(false);
      setRequestMessage("");
      setRequestScheduledFor("");
      setSelectedSkill(null);
    } catch (error) {
      console.error("Failed to create request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Skills</h1>
          <p className="text-muted-foreground">
            Find and connect with people who can teach you new skills
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading skills...</p>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No skills found</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onRequest={user?.uid && skill.userId === user.uid ? undefined : handleRequestSkill}
              />
            ))}
          </div>
        )}
      </main>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Skill</DialogTitle>
            <DialogDescription>
              Send a message to request this skill exchange.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proposed time</label>
              <Input
                type="datetime-local"
                value={requestScheduledFor}
                onChange={(e) => setRequestScheduledFor(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pick a time that works for you (optional).
              </p>
            </div>
            <Textarea
              placeholder="Tell them why you're interested in learning this skill..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
