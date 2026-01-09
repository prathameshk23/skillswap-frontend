"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Star, Mail, MapPin } from "lucide-react";

export default function ProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await api.getUserProfile(userId);
      
      setProfile(profileData);
      setSkills(profileData.skills || []);
      setRatings(profileData.reviews || []);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={profile.avatar} alt={profile.displayName} />
                  <AvatarFallback className="text-2xl">
                    {profile.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">{profile.displayName}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>
                )}
                
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 border-t border-border pt-4">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                  <span className="text-2xl font-bold">
                    {(profile.averageRating || averageRating).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({profile.totalReviews || ratings.length} {(profile.totalReviews || ratings.length) === 1 ? "review" : "reviews"})
                  </span>
                </div>
                
                {profile.bio && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills and Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Skills Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Skills Offered</h2>
              {skills.length === 0 ? (
                <p className="text-muted-foreground">No skills offered yet</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {skills.map((skill) => (
                    <Card key={skill.id}>
                      <CardHeader className="pb-3">
                        <h3 className="font-semibold text-lg">{skill.title}</h3>
                        <Badge variant="secondary" className="w-fit">
                          {skill.category}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {skill.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Reviews</h2>
              {ratings.length === 0 ? (
                <p className="text-muted-foreground">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <Card key={rating.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={rating.reviewerAvatar || undefined}
                                alt={rating.reviewerName || "Reviewer"}
                              />
                              <AvatarFallback>
                                {(rating.reviewerName || "U").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {rating.reviewerName || "Anonymous"}
                              </p>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => {
                                  const normalizedRating = Number(rating.rating) || 0;
                                  const filled = i < normalizedRating;
                                  return (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      filled
                                        ? "fill-primary text-primary"
                                        : "text-muted-foreground/40"
                                    }`}
                                  />
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        {(rating.comment || rating.review) && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                            {rating.comment || rating.review}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
