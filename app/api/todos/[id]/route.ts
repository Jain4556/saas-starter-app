import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { error } from "console";



export async function DELETE(req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    try {
        const todoId = params.id

        const todo = await prisma.todo.findUnique({
            where: { id: todoId }
        })

        if (!todo) {
            return NextResponse.json({ error: "todo not found" }, { status: 401 })
        }

        if (todo.userId !== userId) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 })
        }

        await prisma.todo.delete({
            where: { id: todoId }


        })

    } catch (err) {
        console.error("Error  updating subscription", err)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}