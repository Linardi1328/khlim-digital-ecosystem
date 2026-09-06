from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"Expected pattern not found in {path}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))


billing = "apps/api/src/billing/billing.service.ts"

replace_once(
    billing,
    '''    const rawBody = hasExplicitOrganization
      ? maybeRawBody
      : (headersOrRawBody as Buffer);''',
    '''    const rawBody = hasExplicitOrganization
      ? (maybeRawBody as Buffer)
      : (headersOrRawBody as Buffer);''',
)

replace_once(
    billing,
    '''        await transaction.paymentProviderEvent.update({
          where: {
            organizationId_provider_providerEventId: {
              organizationId,
              provider,
              providerEventId: event.providerEventId,
            },
          },
          data: { processingStatus: "PROCESSED", processedAt: new Date() },
        });''',
    '''        const updatedEvent = await transaction.paymentProviderEvent.updateMany({
          where: {
            organizationId,
            provider,
            providerEventId: event.providerEventId,
          },
          data: { processingStatus: "PROCESSED", processedAt: new Date() },
        });
        if (updatedEvent.count !== 1) {
          throw new ConflictException(
            "Provider event belongs to a different organization",
          );
        }''',
)

replace_once(
    billing,
    '''      await transaction.paymentProviderEvent.update({
        where: {
          provider_providerEventId: {
            provider,
            providerEventId: event.providerEventId,
          },
        },
        data: {
          processingStatus: actionRequired ? "ACTION_REQUIRED" : "PROCESSED",
          processedAt: now,
        },
      });''',
    '''      const updatedEvent = await transaction.paymentProviderEvent.updateMany({
        where: {
          organizationId,
          provider,
          providerEventId: event.providerEventId,
        },
        data: {
          processingStatus: actionRequired ? "ACTION_REQUIRED" : "PROCESSED",
          processedAt: now,
        },
      });
      if (updatedEvent.count !== 1) {
        throw new ConflictException(
          "Provider event belongs to a different organization",
        );
      }''',
)

replace_once(
    billing,
    '''  private finishProviderEvent(
    organizationId: string,
    provider: string,
    providerEventId: string,
    processingStatus: "PROCESSED" | "ACTION_REQUIRED" | "FAILED",
  ) {
    return this.prisma.client.paymentProviderEvent
      .update({
        where: { provider_providerEventId: { provider, providerEventId } },
        data: { processingStatus, processedAt: new Date() },
      })
      .then((event) => {
        if (event.organizationId !== organizationId) {
          throw new ConflictException(
            "Provider event belongs to a different organization",
          );
        }
        return event;
      });
  }''',
    '''  private async finishProviderEvent(
    organizationId: string,
    provider: string,
    providerEventId: string,
    processingStatus: "PROCESSED" | "ACTION_REQUIRED" | "FAILED",
  ) {
    const event = await this.prisma.client.paymentProviderEvent.findFirst({
      where: { organizationId, provider, providerEventId },
      select: { id: true },
    });
    if (!event) {
      throw new ConflictException(
        "Provider event belongs to a different organization",
      );
    }
    return this.prisma.client.paymentProviderEvent.update({
      where: { id: event.id },
      data: { processingStatus, processedAt: new Date() },
    });
  }''',
)
