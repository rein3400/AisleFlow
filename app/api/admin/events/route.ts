import { createEvent, listAdminEvents } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAdminApiUser();
    const events = await listAdminEvents(user);

    return jsonSuccess({
      events,
    });
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminApiUser();
    const body = (await request.json()) as {
      title?: string;
      brideName?: string;
      groomName?: string;
      eventDate?: string;
      venueName?: string;
      welcomeMessage?: string;
      guestTargetTotal?: number;
      primaryColor?: string;
      secondaryColor?: string;
      heroImageDataUrl?: string;
      backgroundImageDataUrl?: string;
      initialSessionLabel?: string;
      initialSessionCapacity?: number;
      eventAdminName?: string;
      eventAdminEmail?: string;
      eventAdminPassword?: string;
    };

    const result = await createEvent(user, {
      title: String(body.title ?? ""),
      brideName: String(body.brideName ?? ""),
      groomName: String(body.groomName ?? ""),
      eventDate: String(body.eventDate ?? ""),
      venueName: String(body.venueName ?? ""),
      welcomeMessage: String(body.welcomeMessage ?? ""),
      guestTargetTotal: Number(body.guestTargetTotal ?? 0),
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      heroImageDataUrl: body.heroImageDataUrl,
      backgroundImageDataUrl: body.backgroundImageDataUrl,
      initialSessionLabel: String(body.initialSessionLabel ?? ""),
      initialSessionCapacity: Number(body.initialSessionCapacity ?? 0),
      eventAdminName: String(body.eventAdminName ?? ""),
      eventAdminEmail: String(body.eventAdminEmail ?? ""),
      eventAdminPassword: String(body.eventAdminPassword ?? ""),
    });

    return jsonSuccess(result, { status: 201 });
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
