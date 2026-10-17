// Prisma adapter of AccountContext (design D4, D9): the gateways the cross-match looks into and the association of
// the channels seen in the analysis.
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { AccountContext } from '../application/ports.js'
import type { ChannelFact } from '../domain/channel-notice.js'
import type { GatewayFormat, IdFormat } from '../domain/normalize-source-id.js'

const ID_FORMATS = new Set<string>(['numeric', 'uuid'])

const gatewaySelect = { gatewayId: true, gateway: { select: { idFormat: true } } } as const

function distinctGateways(channels: { gatewayId: number; gateway: { idFormat: string } }[]): GatewayFormat[] {
  const gateways = new Map<number, GatewayFormat>()
  for (const channel of channels) {
    if (!ID_FORMATS.has(channel.gateway.idFormat)) continue
    gateways.set(channel.gatewayId, { gatewayId: channel.gatewayId, idFormat: channel.gateway.idFormat as IdFormat })
  }
  return [...gateways.values()].sort((a, b) => a.gatewayId - b.gatewayId)
}

export class PrismaAccountContext implements AccountContext {
  constructor(private readonly prisma: PrismaClient) {}

  /** Channels associated to the account (AccountChannel); the provider's channels when there are none (decision 1). */
  async gatewaysOf(accountId: string): Promise<GatewayFormat[]> {
    const own = await this.prisma.accountChannel.findMany({
      where: { accountId },
      select: { channel: { select: gatewaySelect } },
    })
    if (own.length > 0) return distinctGateways(own.map((r) => r.channel))
    const account = await this.prisma.account.findUnique({ where: { accountId }, select: { providerId: true } })
    if (!account) return []
    const provider = await this.prisma.channel.findMany({
      where: { providerId: account.providerId },
      select: gatewaySelect,
    })
    return distinctGateways(provider)
  }

  async channelAssignments(accountId: string, channelIds: number[]): Promise<ChannelFact[]> {
    if (channelIds.length === 0) return []
    const channels = await this.prisma.channel.findMany({
      where: { channelId: { in: channelIds } },
      select: {
        channelId: true,
        name: true,
        gatewayId: true,
        providerId: true,
        accountChannels: {
          where: { OR: [{ isPrimary: true }, { accountId }] },
          select: { accountId: true, isPrimary: true, account: { select: { accountId: true, name: true } } },
        },
      },
    })
    return channels.map((c) => ({
      channelId: c.channelId,
      name: c.name,
      gatewayId: c.gatewayId,
      providerId: c.providerId,
      primaryAccount: c.accountChannels.find((ac) => ac.isPrimary)?.account ?? null,
      assignedToThisAccount: c.accountChannels.some((ac) => ac.accountId === accountId),
    }))
  }
}
