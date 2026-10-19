import "dotenv/config";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import { signToken } from "../utils/jwt.js";
import bcrypt from "bcrypt";

async function runTests() {
  console.log("Starting verification tests for Phase 1 Tasks API...\n");

  // Clean up any previous test tasks/projects/users created specifically by this test
  const testAdminEmail = "test_admin_phase1@example.com";
  const testUserEmail1 = "test_member_phase1@example.com";
  const testUserEmail2 = "test_outsider_phase1@example.com";

  await prisma.task.deleteMany({
    where: {
      title: { contains: "Phase 1 Test Task" },
    },
  });

  const pwdHash = await bcrypt.hash("Password123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: testAdminEmail },
    update: { isActive: true, role: "ADMIN" },
    create: {
      name: "Phase1 Admin",
      email: testAdminEmail,
      passwordHash: pwdHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: testUserEmail1 },
    update: { isActive: true, role: "USER" },
    create: {
      name: "Phase1 Member",
      email: testUserEmail1,
      passwordHash: pwdHash,
      role: "USER",
      isActive: true,
    },
  });

  const outsiderUser = await prisma.user.upsert({
    where: { email: testUserEmail2 },
    update: { isActive: true, role: "USER" },
    create: {
      name: "Phase1 Outsider",
      email: testUserEmail2,
      passwordHash: pwdHash,
      role: "USER",
      isActive: true,
    },
  });

  // Create test project
  const testProject = await prisma.project.create({
    data: {
      name: "Phase 1 Test Project",
      createdById: adminUser.id,
      members: {
        create: [{ userId: memberUser.id }],
      },
    },
  });

  // Generate tokens
  const adminToken = signToken(adminUser.id, adminUser.role);
  const memberToken = signToken(memberUser.id, memberUser.role);
  const outsiderToken = signToken(outsiderUser.id, outsiderUser.role);

  // Start HTTP server on dynamic port
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3001;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Authorized user (member) can list tasks (initially empty)
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const data = await res.json() as any;
      assert(res.status === 200 && Array.isArray(data.data) && data.data.length === 0, "Scenario 1: Member can list tasks in accessible project");
    }

    // 2. Outsider user cannot list tasks from an unauthorized project (403)
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      const data = await res.json() as any;
      assert(res.status === 403 && data.error?.code === "FORBIDDEN", "Scenario 2: Outsider receives 403 Forbidden when listing tasks");
    }

    // 3. Authorized user can create a task
    let createdTaskId: number;
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "Phase 1 Test Task 1",
          description: "Testing task creation",
          assignedToId: memberUser.id,
        }),
      });
      const data = await res.json() as any;
      createdTaskId = data.data?.id;
      assert(
        res.status === 201 &&
          data.data?.title === "Phase 1 Test Task 1" &&
          data.data?.status === "PENDING" &&
          data.data?.assignedTo?.id === memberUser.id &&
          data.data?.assignedTo?.name === memberUser.name &&
          data.data?.assignedTo?.passwordHash === undefined,
        "Scenario 3: Authorized user can create a task with assignedTo user"
      );
    }

    // 4. Empty task title is rejected (422)
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "   ",
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 422 && data.error?.code === "VALIDATION_ERROR", "Scenario 4: Empty or whitespace task title is rejected with 422");
    }

    // 5. Invalid project ID is handled correctly (400 or 404)
    {
      const res = await fetch(`${baseUrl}/api/projects/abc/tasks`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const data = await res.json() as any;
      assert(res.status === 400 && data.error?.code === "BAD_REQUEST", "Scenario 5: Non-numeric project ID returns 400 Bad Request");

      const notFoundRes = await fetch(`${baseUrl}/api/projects/999999/tasks`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const notFoundData = await notFoundRes.json() as any;
      assert(notFoundRes.status === 404 && notFoundData.error?.code === "NOT_FOUND", "Scenario 5b: Non-existent project ID returns 404 Not Found");
    }

    // 6. Invalid assignee is rejected (400)
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "Phase 1 Test Task Invalid Assignee",
          assignedToId: 999999,
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 400 && data.error?.code === "BAD_REQUEST", "Scenario 6: Non-existent assignee is rejected with 400");
    }

    // 7. Assignee who is not a project member is rejected (400)
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "Phase 1 Test Task Non-member Assignee",
          assignedToId: outsiderUser.id,
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 400 && data.error?.code === "BAD_REQUEST", "Scenario 7: Assignee not in project is rejected with 400");
    }

    // 8. Creator is derived from the authenticated user & initial status is PENDING
    {
      const dbTask = await prisma.task.findUnique({
        where: { id: createdTaskId! },
      });
      assert(
        dbTask?.createdById === memberUser.id && dbTask?.status === "PENDING" && dbTask?.position === 0,
        "Scenario 8 & 9: Task createdById is derived from auth user and initial status is PENDING with position 0"
      );
    }

    // 9. Admin can list tasks in any project
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json() as any;
      assert(res.status === 200 && data.data?.length === 1 && data.data[0].id === createdTaskId!, "Scenario 9b: Admin can access tasks in project");
    }

    // 10. Task without assignee is valid and returns null assignedTo
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "Phase 1 Test Task Unassigned",
          description: null,
        }),
      });
      const data = await res.json() as any;
      assert(
        res.status === 201 && data.data?.assignedTo === null && data.data?.title === "Phase 1 Test Task Unassigned",
        "Scenario 10: Unassigned task is created successfully with assignedTo null"
      );
    }

    // 11. Password hashes are never returned
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const data = await res.json() as any;
      const stringified = JSON.stringify(data);
      assert(!stringified.includes("passwordHash") && !stringified.includes("Password123!"), "Scenario 11: No password hash or credential returned in task list");
    }

  } finally {
    // Cleanup
    await prisma.task.deleteMany({
      where: { projectId: testProject.id },
    });
    await prisma.projectMember.deleteMany({
      where: { projectId: testProject.id },
    });
    await prisma.project.delete({
      where: { id: testProject.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUser.id, memberUser.id, outsiderUser.id] },
      },
    });

    server.close();
    await prisma.$disconnect();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
