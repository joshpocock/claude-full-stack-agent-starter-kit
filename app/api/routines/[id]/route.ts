import { NextResponse } from "next/server";
import { deleteRoutine, updateRoutine } from "@/lib/db";

/**
 * PATCH /api/routines/:id
 * Update a routine's fields.
 *
 * Body: { name?, routine_id?, token?, description?, trigger_type? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const updated = updateRoutine(numId, body);
    if (!updated) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update routine";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/routines/:id
 * Removes a routine from SQLite.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const removed = deleteRoutine(numId);
    if (!removed) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete routine";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
