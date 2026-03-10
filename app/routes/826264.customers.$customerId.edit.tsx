import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";

function isDuplicateDisplayNameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: `Sửa ${data?.customer.displayName || "Thành viên"} - Quản trị - Kana Box V2`,
  },
];

interface ActionData {
  errors?: {
    displayName?: string;
    form?: string;
  };
  values?: {
    displayName: string;
    note: string;
  };
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { ObjectId } = await import("mongodb");
  const { getCustomerById } = await import("../models/customer.server");

  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }

  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }

  return json({
    customer: {
      _id: customer._id.toString(),
      displayName: customer.displayName,
      note: customer.note,
    },
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { ObjectId } = await import("mongodb");
  const { updateCustomer } = await import("../models/customer.server");

  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }

  const formData = await request.formData();
  const displayName = String(formData.get("name") || "");
  const noteInput = String(formData.get("note") || "");

  const displayNameTrimmed = displayName.trim();
  const noteTrimmed = noteInput.trim();

  const errors: ActionData["errors"] = {};

  if (!displayNameTrimmed) {
    errors.displayName = "Tên là bắt buộc";
  } else if (displayNameTrimmed.length > 60) {
    errors.displayName = "Tên tối đa 60 ký tự";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      {
        errors,
        values: { displayName: displayNameTrimmed, note: noteTrimmed },
      },
      { status: 400 }
    );
  }

  try {
    const result = await updateCustomer(customerId, {
      displayName: displayNameTrimmed,
      note: noteTrimmed || undefined,
    });

    if (!result) {
      throw new Response("Không tìm thấy thành viên", { status: 404 });
    }

    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    if (isDuplicateDisplayNameError(error)) {
      return json<ActionData>(
        {
          errors: { displayName: "Đã có thành viên với tên này" },
          values: { displayName: displayNameTrimmed, note: noteTrimmed },
        },
        { status: 400 }
      );
    }

    console.error("Error updating customer:", error);
    return json<ActionData>(
      {
        errors: { form: "Cập nhật thành viên thất bại. Vui lòng thử lại." },
        values: { displayName: displayNameTrimmed, note: noteTrimmed },
      },
      { status: 500 }
    );
  }
}

export default function AdminEditCustomer() {
  const { customer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to={`/826264/customers/${customer._id}`} className="text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          {customer.displayName}
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900 font-medium">Sửa</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sửa thành viên</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{actionData.errors.form}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Tên <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="name"
                id="name"
                defaultValue={actionData?.values?.displayName || customer.displayName}
                className={actionData?.errors?.displayName ? "border-red-300 focus-visible:ring-red-500" : ""}
                placeholder="Tên thành viên"
                maxLength={60}
                required
              />
              {actionData?.errors?.displayName ? (
                <p className="text-sm text-red-600">{actionData.errors.displayName}</p>
              ) : (
                <p className="text-xs text-zinc-400">Phải duy nhất. 1–60 ký tự.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                name="note"
                id="note"
                rows={4}
                defaultValue={actionData?.values?.note || customer.note || ""}
                placeholder="Ghi chú (tùy chọn) về thành viên..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link to={`/826264/customers/${customer._id}`}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
