import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAgentLoads, getNeedsCover } from "@/lib/manpower";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [loads, needsCover] = await Promise.all([getAgentLoads(), getNeedsCover()]);
  return NextResponse.json({
    loads,
    needsCover: needsCover.map((l) => ({
      id: l.id,
      code: l.code,
      segment: l.segment,
      owner: l.agent ? { id: l.agent.id, name: l.agent.name, status: l.agent.status } : null,
      cover: l.agent?.backupAgent ?? null,
    })),
  });
}
