import { Elysia, t } from "elysia"
import { html } from "@elysiajs/html"
import * as elements from "typed-html"
import { db } from "./db"
import { Todo, todos } from "./db/schema.ts"
import { eq } from "drizzle-orm"

const app = new Elysia()
  .use(html())
  .get("/",
    ({ html }) => html(
      <BaseHtml>
        <body
          class="flex w-full h-screen justify-center items-center"
          hx-get="/todos"
          hx-trigger="load"
          hx-swap="innerHTML"
        >
        </body>
      </BaseHtml>))
  .get("/todos", async () => {
    console.log("hello")
    const data = await db.select().from(todos).all()
    return <TodoList todos={data} />
  })
  .post("/todos/toggle/:id", async ({ params }) => {
    const oldTodo = await db
      .select()
      .from(todos)
      .where(eq(todos.id, Number(params.id)))
      .get()
    const newTodo = await db
      .update(todos)
      .set({ completed: !oldTodo?.completed })
      .where(eq(todos.id, Number(params.id)))
      .returning()
      .get()
    return <TodoItem {...newTodo} />
  },
    {
      params: t.Object({
        id: t.Numeric()
      })
    }
  )
  .delete("/todos/:id", async ({ params }) => {
    await db.delete(todos).where(eq(todos.id, Number(params.id))).run()
  },
    {
      params: t.Object({
        id: t.Numeric()
      })
    }
  )
  .post("/todos", async ({ body }) => {
    if (body.content.length === 0) {
      throw new Error("Content cannot be empty")
    }
    const newTodo = await db.insert(todos).values(body).returning().get()
    return <TodoItem {...newTodo} />
  },
    {
      body: t.Object({
        content: t.String()
      })
    }
  )
  .listen(3003)

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}/`)

const BaseHtml = ({ children }: elements.Children) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=, initial-scale=1.0">
    <script src="https://unpkg.com/htmx.org@1.9.3"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Elysia</title>
</head>
${children}
`

function TodoItem({ content, completed, id }: Todo) {
  return (
    <div class="flex flex-row space-x-3">
      <input
        type="checkbox"
        checked={completed}
        hx-post={`/todos/toggle/${id}`}
        hx-target="closest div"
        hx-swap="outerHTML"
      />
      <span>{content}</span>
      <button
        class="text-red-500"
        hx-delete={`/todos/${id}`}
        hx-target="closest div"
        hx-swap="outerHTML"
      >
        Delete
      </button>
    </div>
  )
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div>
      {todos.map((todo) => (
        <TodoItem {...todo} />
      ))}
      <TodoForm />
    </div>
  )
}

function TodoForm() {
  return (
    <form
      class="flex flex-row space-x-3"
      hx-post="/todos"
      hx-swap="beforebegin"
    >
      <input type="text" name="content" class="border border-black" />
      <button type="submit">Add</button>
    </form>
  )
}
