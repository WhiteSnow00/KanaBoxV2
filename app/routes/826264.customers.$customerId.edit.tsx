import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";

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
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          to={`/826264/customers/${customer._id}`}
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          ← Quay lại {customer.displayName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Sửa thành viên
        </h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Form method="post" className="space-y-6 p-6">
          {actionData?.errors?.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{actionData.errors.form}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={actionData?.values?.displayName || customer.displayName}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                actionData?.errors?.displayName ? "border-red-300" : ""
              }`}
              placeholder="Tên thành viên"
              maxLength={60}
              required
            />
            {actionData?.errors?.displayName ? (
              <p className="mt-1 text-sm text-red-600">{actionData.errors.displayName}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Phải duy nhất. 1–60 ký tự.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700"
            >
              Ghi chú
            </label>
            <textarea
              name="note"
              id="note"
              rows={4}
              defaultValue={actionData?.values?.note || customer.note || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Ghi chú (tùy chọn) về thành viên..."
            />
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link
              to={`/826264/customers/${customer._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Lưu thay đổi
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
