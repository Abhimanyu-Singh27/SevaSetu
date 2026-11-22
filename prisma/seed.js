// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const services = [
  ["Home repairs", "home-repairs", ["Electrical repair", "Plumbing repair", "Appliance repair", "Air-conditioner service", "Air-conditioner installation", "Geyser repair", "Water purifier service", "Inverter and battery service", "Locksmith", "Door and window repair"]],
  ["Cleaning", "cleaning", ["House cleaning", "Deep cleaning", "Bathroom cleaning", "Kitchen cleaning", "Garden cleaning", "Water-tank cleaning", "Sofa and upholstery cleaning", "Carpet cleaning", "Move-in and move-out cleaning"]],
  ["Moving & delivery", "moving-delivery", ["Moving help", "Packing and unpacking", "Loading and unloading", "Local delivery", "Furniture assembly", "Appliance installation"]],
  ["Construction", "construction", ["Carpentry", "Painting", "Masonry", "Tile and flooring work", "Waterproofing", "Home renovation", "False ceiling installation", "Welding and fabrication", "Plastering", "Window and grill installation"]],
  ["Garden care", "garden-care", ["Garden care", "Lawn mowing", "Landscaping", "Tree trimming", "Plant care"]],
  ["Pest control", "pest-control", ["Pest control", "Termite treatment", "Mosquito control", "Rodent control", "Bed bug treatment"]],
  ["Car wash", "car-wash", ["Car wash", "Bike wash", "Car detailing", "Interior car cleaning", "Vehicle polishing"]],
  ["Event help", "event-help", ["Event help", "Event setup and cleanup", "Event decoration", "Event photography", "Catering assistance", "Sound and lighting setup", "Makeup for events"]],
  ["Automotive services", "automotive-services", ["Car mechanic", "Bike mechanic", "Vehicle battery service", "Puncture repair", "Roadside assistance", "Vehicle inspection"]],
  ["Technology help", "technology-help", ["Mobile phone repair", "Computer and laptop repair", "Wi-Fi and router setup", "Printer repair", "CCTV installation", "Smart home setup", "Data backup and transfer"]],
  ["Tailoring & laundry", "tailoring-laundry", ["Laundry service", "Ironing service", "Tailoring", "Clothing alterations", "Curtain stitching", "Shoe repair"]],
  ["Personal care & wellness", "personal-care-wellness", ["Home salon service", "Haircut at home", "Home spa service", "Yoga instruction", "Personal fitness training", "Makeup service"]],
  ["Education & tutoring", "education-tutoring", ["Home tutoring", "Language tutoring", "Music lessons", "Computer lessons", "Exam preparation", "Art lessons"]],
  ["Home and family care", "home-family-care", ["Childcare", "Elder care assistance", "Home cooking", "Meal preparation", "Household assistance"]],
  ["Pet care", "pet-care", ["Pet grooming", "Dog walking", "Pet sitting", "Pet training"]],
  ["Office & business support", "office-business-support", ["Office cleaning", "Office moving assistance", "Office equipment setup", "Document pickup and delivery", "Commercial photography"]],
];

async function main() {
  for (const [categoryName, categorySlug, serviceNames] of services) {
    const category = await prisma.serviceCategory.upsert({ where: { slug: categorySlug }, update: { active: true }, create: { name: categoryName, slug: categorySlug, description: `${categoryName} services from local professionals.` } });
    for (const name of serviceNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await prisma.service.upsert({ where: { slug }, update: { active: true, categoryId: category.id }, create: { name, slug, categoryId: category.id, description: `${name} from verified SevaSetu professionals.` } });
    }
  }
  console.log("SevaSetu development service catalog seeded.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
