const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const templateTasks = [
  { phase: 'PLANNING', name: 'Creating architectural plans', description: 'Prepare blueprint and project drawings.' },
  { phase: 'PLANNING', name: 'Submit plans for approval', description: 'Submit plans to authority and track approval.' },
  { phase: 'PLANNING', name: 'Order materials', description: 'Order concrete, steel, and finishing materials.' },
  { phase: 'SITE_WORKS', name: 'Erect fencing', description: 'Secure perimeter with temporary fencing.' },
  { phase: 'SITE_WORKS', name: 'Erect site building', description: 'Build temporary offices and utility sheds.' },
  { phase: 'SITE_WORKS', name: 'Clear and level site', description: 'Site clearing and grading operations.' },
  { phase: 'SITE_WORKS', name: 'Prepare drainage infrastructure', description: 'Install storm water and drainage channels.' },
  { phase: 'SITE_WORKS', name: 'Prepare cabling infrastructure', description: 'Lay conduit and underground cable channels.' },
  { phase: 'BUILDING_CONSTRUCTION', name: 'Pour foundations', description: 'Excavate and pour structural foundations.' },
  { phase: 'BUILDING_CONSTRUCTION', name: 'Erect steelwork', description: 'Assemble primary steel structure.' },
  { phase: 'BUILDING_CONSTRUCTION', name: 'Erect wall', description: 'Construct retaining and building walls.' },
  { phase: 'BUILDING_CONSTRUCTION', name: 'Install roofing superstructure', description: 'Install roof framing and support beams.' },
  { phase: 'BUILDING_CONSTRUCTION', name: 'Install roofing retracting mechanism', description: 'Install retractable roofing mechanics.' },
  { phase: 'BUILDING_CONSTRUCTION', name: 'Erect seating tiers', description: 'Build tiered seating structure.' },
  { phase: 'INSTALLATION', name: 'Install electrical systems', description: 'Install power distribution and control systems.' },
  { phase: 'INSTALLATION', name: 'Install plumbing', description: 'Install water and drainage plumbing systems.' },
  { phase: 'INSTALLATION', name: 'Install turf', description: 'Lay and secure turf system.' },
  { phase: 'INSTALLATION', name: 'Install scoreboards', description: 'Install digital scoreboards.' },
  { phase: 'INSTALLATION', name: 'Install sound system', description: 'Deploy stadium sound infrastructure.' },
  { phase: 'INSTALLATION', name: 'Install video system', description: 'Install display and camera systems.' },
  { phase: 'INSPECTION_COMPLETION', name: 'Final inspection', description: 'Perform final quality and safety inspection.' },
  { phase: 'INSPECTION_COMPLETION', name: 'Project completion', description: 'Handover and close out project.' },
];

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@construction.local' },
    update: {},
    create: { email: 'admin@construction.local', fullName: 'System Admin', passwordHash, role: 'ADMIN' }
  });

  const project = await prisma.project.create({
    data: {
      name: 'City Stadium Build',
      location: 'Downtown Zone A',
      description: 'Reference project seeded from Microsoft Project export.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
      managerId: admin.id,
      status: 'IN_PROGRESS',
    },
  });

  for (const [index, task] of templateTasks.entries()) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        name: task.name,
        phase: task.phase,
        description: task.description,
        startDate: new Date(Date.now() + index * 86400000),
        endDate: new Date(Date.now() + (index + 3) * 86400000),
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
