import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProfile } from "@/context/profile";
import { useBranding } from "@/context/branding";
import { getMediaUrl } from "@/lib/api";

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});

function ProfilesPage() {
  const { profiles, setActiveProfile } = useProfile();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const handleSelect = (profile: any) => {
    setActiveProfile(profile);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-12 text-foreground">
        Who's watching {branding.platformName}?
      </h1>

      <div className="flex flex-wrap justify-center gap-6 md:gap-10">
        {profiles.map((profile) => {
          const shapeClass =
            profile.avatar_shape === "circle" ? "rounded-full" :
            profile.avatar_shape === "rounded" ? "rounded-2xl" :
            "rounded-md";
          return (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile)}
            className="group flex flex-col items-center gap-4 transition-transform hover:scale-110 motion-reduce:transition-none"
          >
            <div className={`w-28 h-28 md:w-36 md:h-36 ${shapeClass} shadow-lg flex items-center justify-center text-4xl font-display text-white border-2 border-transparent group-hover:border-white transition-colors overflow-hidden ${profile.color}`}>
              {profile.profile_picture_url ? (
                <img
                  src={getMediaUrl(profile.profile_picture_url)}
                  alt={profile.name}
                  className={`w-full h-full object-cover ${shapeClass}`}
                />
              ) : (
                profile.name.charAt(0)
              )}
            </div>
            <span className="text-muted-foreground group-hover:text-foreground text-lg transition-colors">
              {profile.name}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
