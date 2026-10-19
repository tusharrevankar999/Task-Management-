import "dotenv/config";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import { signToken } from "../utils/jwt.js";
import bcrypt from "bcrypt";

async function runTests() {
  console.log(" Starting verification tests for full CRUD Tasks API...\n");

  const testAdminEmail = "crud_admin_test@example.com";
  const testUserEmail1 = "crud_member_test@example.com";
  const testUserEmail2 = "crud_outsider_test@example.com";

  await prisma.task.deleteMany({
    where: {
      title: { contains: "CRUD Test Task" },
    },
  });

  const pwdHash = await bcrypt.hash("Password123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: testAdminEmail },
    update: { isActive: true, role: "ADMIN" },
    create: {
      name: "CRUD Admin",
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
      name: "CRUD Member",
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
      name: "CRUD Outsider",
      email: testUserEmail2,
      passwordHash: pwdHash,
      role: "USER",
      isActive: true,
    },
  });

  const testProject = await prisma.project.create({
    data: {
      name: "CRUD Test Project",
      createdById: adminUser.id,
      members: {
        create: [{ userId: memberUser.id }],
      },
    },
  });

  // const adminToken = signToken(adminUser.id, adminUser.role);
  const memberToken = signToken(memberUser.id, memberUser.role);
  const outsiderToken = signToken(outsiderUser.id, outsiderUser.role);

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3002;
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
    let taskId: number;

    // 1. POST - Create Task
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "CRUD Test Task 1",
          description: "Initial description",
          assignedToId: memberUser.id,
        }),
      });
      const data = (await res.json()) as any;
      taskId = data.data?.id;
      assert(
        res.status === 201 && data.data?.title === "CRUD Test Task 1" && data.data?.status === "PENDING",
        "Create Task: Returns 201 with created task"
      );
    }

    // 2. GET - List Tasks
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const data = (await res.json()) as any;
      assert(res.status === 200 && Array.isArray(data.data) && data.data.length === 1, "List Tasks: Returns 200 with task array");
    }

    // 3. GET - Get Single Task
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks/${taskId!}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const data = (await res.json()) as any;
      assert(
        res.status === 200 && data.data?.id === taskId! && data.data?.title === "CRUD Test Task 1",
        "Get Single Task: Returns 200 with task object"
      );
    }

    // 4. PATCH - Update Task status & title
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks/${taskId!}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          title: "CRUD Test Task 1 Updated",
          status: "IN_PROGRESS",
        }),
      });
      const data = (await res.json()) as any;
      assert(
        res.status === 200 &&
        data.data?.title === "CRUD Test Task 1 Updated" &&
        data.data?.status === "IN_PROGRESS",
        "Update Task: Returns 200 with updated fields"
      );
    }

    // 5. PATCH - Unauthorized member cannot update task
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks/${taskId!}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${outsiderToken}`,
        },
        body: JSON.stringify({
          title: "Hacked Title",
        }),
      });
      const data = (await res.json()) as any;
      assert(res.status === 403 && data.error?.code === "FORBIDDEN", "Update Task Auth: Non-member gets 403 Forbidden");
    }

    // 6. DELETE - Non-member cannot delete task
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks/${taskId!}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      const data = (await res.json()) as any;
      assert(res.status === 403 && data.error?.code === "FORBIDDEN", "Delete Task Auth: Non-member gets 403 Forbidden");
    }

    // 7. DELETE - Authorized member deletes task
    {
      const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks/${taskId!}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      assert(res.status === 204, "Delete Task: Returns 204 No Content");

      // Verify task is gone
      const getRes = await fetch(`${baseUrl}/api/projects/${testProject.id}/tasks/${taskId!}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const getData = (await getRes.json()) as any;
      assert(getRes.status === 404 && getData.error?.code === "NOT_FOUND", "Verify Delete: Deleted task returns 404 Not Found");
    }
  } finally {
    await prisma.task.deleteMany({ where: { projectId: testProject.id } });
    await prisma.projectMember.deleteMany({ where: { projectId: testProject.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, memberUser.id, outsiderUser.id] } },
    });
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\nCRUD Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
