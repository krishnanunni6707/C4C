export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  photo?: string;
  github?: string;
  linkedin?: string;
  x?: string;
}

/**
 * --------------------------------------------------------------------------
 * INSTRUCTIONS FOR ADDING REAL TEAM PHOTOS:
 * --------------------------------------------------------------------------
 * 1. Place high-resolution square JPG/PNG images into `/public/team/`
 *    e.g. `/public/team/aarav-nair.jpg`
 * 2. Set the `photo` field below to `"/team/aarav-nair.jpg"`
 * 3. If `photo` is omitted or left undefined, an elegant circular fallback
 *    with the member's initials on an indigo gradient will be rendered.
 * --------------------------------------------------------------------------
 */
export const teamMembers: TeamMember[] = [
  {
    name: "Aadya Ajayan",
    role: "UIUX Developer",
    bio: "Turns ideas into beautiful interfaces. Loves clean code, minimal design and user-focused experiences.",
    photo: undefined, // Drop real photo in /public/team/meera-iyer.jpg and set to "/team/meera-iyer.jpg"
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  {
    name: "Krishnanunni H Pillai",
    role: "Product Lead",
    bio: "Builds products that solve real problems. Passionate about student experiences and scalable systems.",
    photo: undefined, // Drop real photo in /public/team/aarav-nair.jpg and set to "/team/aarav-nair.jpg"
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  {
    name: "Gaayathri M Nair",
    role: "FullStack Developer",
    bio: "Builds reliable systems that scale. Enjoys working with APIs, databases and solving complex problems.",
    photo: undefined, // Drop real photo in /public/team/rohan-deshpande.jpg and set to "/team/rohan-deshpande.jpg"
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  {
    name: "Aksa Thomas",
    role: "Content Strategist",
    bio: "She makes sure C4C communicates clearly and effectively with its users. You can find her behind the lens of the camera too.",
    photo: undefined, // Drop real photo in /public/team/ananya-sharma.jpg and set to "/team/ananya-sharma.jpg"
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
];
