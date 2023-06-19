import { Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import { QuoteListLoading, QuoteLoading } from './loading';
import styled from 'styled-components';
import { IconRefresh } from './IconRefresh';
import { CexQuoteItem, DexQuoteItem, QuoteItemProps } from './QuoteItem';
import {
  TCexQuoteData,
  TDexQuoteData,
  isSwapWrapToken,
  useSetRefreshId,
  useSetSettingVisible,
  useSwapSettings,
} from '../hooks';
import BigNumber from 'bignumber.js';
import { CEX, DEX, DEX_WITH_WRAP } from '@/constant';

const CexListWrapper = styled.div`
  border: 1px solid #e5e9ef;
  border-radius: 6px;
  & > div:not(:last-child) {
    position: relative;
    &:not(:last-child):before {
      content: '';
      position: absolute;
      width: 328px;
      height: 0;
      border-bottom: 1px solid #e5e9ef;
      left: 16px;
      bottom: 0;
    }
  }
`;

const exchangeCount = Object.keys(DEX).length + Object.keys(CEX).length;

interface QuotesProps
  extends Omit<
    QuoteItemProps,
    | 'bestAmount'
    | 'name'
    | 'quote'
    | 'active'
    | 'isBestQuote'
    | 'quoteProviderInfo'
  > {
  list?: (TCexQuoteData | TDexQuoteData)[];
  activeName?: string;
  visible: boolean;
  onClose: () => void;
}

export const Quotes = ({
  visible,
  onClose,
  list,
  activeName,
  inSufficient,
  ...other
}: QuotesProps) => {
  const { swapViewList, swapTradeList } = useSwapSettings();

  const viewCount = useMemo(() => {
    if (swapViewList) {
      return (
        exchangeCount -
        Object.values(swapViewList).filter((e) => e === false).length
      );
    }
    return exchangeCount;
  }, [swapViewList]);

  const tradeCount = useMemo(() => {
    if (swapTradeList) {
      return Object.values(swapTradeList).filter((e) => e === true).length;
    }
    return 0;
  }, [swapTradeList]);

  const setSettings = useSetSettingVisible();
  const openSettings = React.useCallback(() => {
    setSettings(true);
  }, []);
  const sortedList = useMemo(
    () =>
      list?.sort((a, b) => {
        const getNumber = (quote: typeof a) => {
          if (quote.isDex) {
            if (inSufficient) {
              return new BigNumber(quote.data?.toTokenAmount || 0);
            }
            if (!quote.preExecResult) {
              return new BigNumber(0);
            }
            return new BigNumber(
              quote?.preExecResult.swapPreExecTx.balance_change
                .receive_token_list[0].amount || 0
            );
          }

          return new BigNumber(quote?.data?.receive_token?.amount || 0);
        };
        return getNumber(b).minus(getNumber(a)).toNumber();
      }) || [],
    [inSufficient, list]
  );

  const bestAmount = useMemo(() => {
    const bestQuote = sortedList?.[0];

    return (
      (bestQuote?.isDex
        ? inSufficient
          ? new BigNumber(bestQuote.data?.toTokenAmount || 0)
              .div(
                10 **
                  (bestQuote?.data?.toTokenDecimals ||
                    other.receiveToken.decimals ||
                    1)
              )
              .toString(10)
          : bestQuote?.preExecResult?.swapPreExecTx.balance_change
              .receive_token_list[0]?.amount
        : new BigNumber(bestQuote?.data?.receive_token.amount || '0').toString(
            10
          )) || '0'
    );
  }, [inSufficient, other?.receiveToken?.decimals, sortedList]);

  const refresh = useSetRefreshId();

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const fetchedList = useMemo(() => list?.map((e) => e.name) || [], [list]);
  if (isSwapWrapToken(other.payToken.id, other.receiveToken.id, other.chain)) {
    const dex = sortedList.find((e) => e.isDex) as TDexQuoteData | undefined;

    return (
      <>
        <div className="h-18 mb-20 flex items-center gap-8 text-left text-gray-title text-[16px] font-medium ">
          <div>The following swap rates are found</div>
          <div className="w-20 h-20 relative overflow-hidden">
            <div className="w-[36px] h-[36px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
              <IconRefresh onClick={refreshQuote} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[16px]">
          {dex ? (
            <DexQuoteItem
              inSufficient={inSufficient}
              preExecResult={dex?.preExecResult}
              quote={dex?.data}
              name={dex?.name}
              isBestQuote
              bestAmount={`${
                dex?.preExecResult?.swapPreExecTx.balance_change
                  .receive_token_list[0]?.amount || '0'
              }`}
              active={activeName === dex?.name}
              isLoading={dex.loading}
              quoteProviderInfo={{
                name: 'Wrap Contract',
                logo: other?.receiveToken?.logo_url,
              }}
              {...other}
            />
          ) : (
            <QuoteLoading
              name="Wrap Contract"
              logo={other?.receiveToken?.logo_url}
            />
          )}

          <div className="text-13 text-gray-content">
            Wrapping {other.receiveToken.name} tokens directly with the smart
            contract
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="h-18 mb-20 flex items-center gap-8 text-left text-gray-title text-[16px] font-medium ">
        <div>The following swap rates are found</div>
        <div className="w-20 h-20 relative overflow-hidden">
          <div className="w-[36px] h-[36px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
            <IconRefresh onClick={refreshQuote} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (!isDex) return null;
          return (
            <DexQuoteItem
              inSufficient={inSufficient}
              preExecResult={params.preExecResult}
              quote={(data as unknown) as any}
              name={name}
              isBestQuote={idx === 0}
              bestAmount={`${bestAmount}`}
              active={activeName === name}
              isLoading={params.loading}
              quoteProviderInfo={
                DEX_WITH_WRAP[name as keyof typeof DEX_WITH_WRAP]
              }
              {...other}
            />
          );
        })}
        <QuoteListLoading fetchedList={fetchedList} />
      </div>
      <div className="text-gray-light text-12 mt-32 mb-8">Rates from CEX</div>

      <CexListWrapper>
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (isDex) return null;
          return (
            <CexQuoteItem
              name={name}
              data={(data as unknown) as any}
              bestAmount={`${bestAmount}`}
              isBestQuote={idx === 0}
              isLoading={params.loading}
              inSufficient={inSufficient}
            />
          );
        })}
        <QuoteListLoading fetchedList={fetchedList} isCex />
      </CexListWrapper>
      <div className="mt-12 text-gray-light text-12 ">
        Of the {exchangeCount} exchanges, {viewCount} can view quotes and{' '}
        {tradeCount} can trade.{' '}
        <span
          onClick={openSettings}
          className="cursor-pointer text-blue-light underline underline-blue-light"
        >
          Edit
        </span>
      </div>
    </>
  );
};

export const QuoteList = (props: QuotesProps) => {
  const { visible, onClose } = props;
  return (
    <Popup
      visible={visible}
      title={null}
      height={510}
      onClose={onClose}
      closable
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={{
        paddingBottom: 0,
      }}
    >
      <Quotes {...props} />
    </Popup>
  );
};
