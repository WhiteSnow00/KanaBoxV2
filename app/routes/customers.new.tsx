/**
 * Add Customer Route
 * 
 * Form to create a new customer with:
 * - Name (required, unique, 1-60 chars)
 * - Note (optional)
 * 
 * On success, redirects to the customer detail page.
 */

import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json, useActionData, Form, Link } from "@remix-run/react";
import { createCustomer } from "~/models/customer.server";
import { MongoError } from "mongodb";

export const meta: MetaFunction = () => [
  { title: "Thêm thành viên - Kana Box V2" },
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

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const displayName = String(formData.get("name") || "").trim();
  const note = String(formData.get("note") || "").trim();

  const errors: ActionData["errors"] = {};

  // Validate name
  if (!displayName) {
    errors.displayName = "Tên là bắt buộc";
  } else if (displayName.length < 1) {
    errors.displayName = "Tên tối thiểu 1 ký tự";
  } else if (displayName.length > 60) {
    errors.displayName = "Tên tối đa 60 ký tự";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({
      errors,
      values: { displayName, note },
    }, { status: 400 });
  }

  try {
    const customer = await createCustomer({ displayName, note: note || undefined });
    return redirect(`/customers/${customer._id.toString()}`);
  } catch (error) {
    // Handle duplicate key error
    if (error instanceof MongoError && error.code === 11000) {
      return json<ActionData>({
        errors: {
          displayName: "Đã có thành viên với tên này",
        },
        values: { displayName, note },
      }, { status: 400 });
    }

    throw error;
  }
}

export default function AddCustomer() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <Link
          to="/customers"
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          ← Quay lại danh sách thành viên
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Thêm thành viên mới</h1>
      </div>

      {/* Form */}
      <div className="card">
        <Form method="post" className="space-y-6 card-body">
          {actionData?.errors?.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{actionData.errors.form}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="form-label">
              Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={actionData?.values?.displayName || ""}
              className={`form-input mt-1 ${
                actionData?.errors?.displayName ? "border-red-300" : ""
              }`}
              placeholder="Tên thành viên"
              maxLength={60}
              required
            />
            {actionData?.errors?.displayName ? (
              <p className="form-error">{actionData.errors.displayName}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Phải duy nhất. 1–60 ký tự.
              </p>
            )}
          </div>

          {/* Note Field */}
          <div>
            <label htmlFor="note" className="form-label">
              Ghi chú
            </label>
            <textarea
              name="note"
              id="note"
              rows={3}
              defaultValue={actionData?.values?.note || ""}
              className="form-input mt-1"
              placeholder="Ghi chú (tùy chọn) về thành viên..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <Link to="/customers" className="btn-secondary">
              Hủy
            </Link>
            <button type="submit" className="btn-primary">
              Tạo thành viên
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
