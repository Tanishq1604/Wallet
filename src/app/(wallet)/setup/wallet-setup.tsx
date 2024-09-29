import React, { useState, useEffect } from "react";
import { SafeAreaView, Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Image } from "expo-image";
import { router } from "expo-router";
import { View } from "moti";
import styled, { useTheme } from "styled-components/native";
import * as LocalAuthentication from 'expo-local-authentication';
import ethService from "../../../services/EthereumService";
import solanaService from "../../../services/SolanaService";
import neoService from "../../../services/NeoService";
import Button from "../../../components/Button/Button";
import { ThemeType } from "../../../styles/theme";
import { saveEthereumAddresses } from "../../../store/ethereumSlice";
import { saveSolanaAddresses } from "../../../store/solanaSlice";
import { saveNeoAddresses } from "../../../store/neoSlice";
import { authenticate, isAuthEnrolled } from "../../../store/biometricsSlice";
import type { AddressState } from "../../../store/types";
import { GeneralStatus } from "../../../store/types";
import { ROUTES } from "../../../constants/routes";
import WalletIcon from "../../../assets/svg/wallet.svg";
import { LinearGradientBackground } from "../../../components/Styles/Gradient";
import { RootState } from "../../../store";

const SafeAreaContainer = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-end;
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const TextContainer = styled.View<{ theme: ThemeType }>`
  padding: ${(props) => props.theme.spacing.large};
`;

const Title = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 32px;
  color: ${(props) => props.theme.fonts.colors.primary};
  margin-bottom: ${(props) => props.theme.spacing.small};
`;

const Subtitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  color: ${(props) => props.theme.fonts.colors.primary};
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  padding-left: ${(props) => props.theme.spacing.large};
  padding-right: ${(props) => props.theme.spacing.large};
  padding-bottom: ${(props) => props.theme.spacing.large};
  padding-top: ${(props) => props.theme.spacing.small};
`;

const ExpoImage = styled(Image)`
  flex: 1;
  width: 100%;
`;

const ImageContainer = styled(View)<{ theme: ThemeType }>`
  flex: 1;
  width: 100%;
  justify-content: center;
  align-items: center;
`;

const SecondaryButtonContainer = styled.TouchableOpacity`
  padding: 10px 20px;
  border-radius: 5px;
  align-items: center;
  height: 60px;
  justify-content: center;
  width: 100%;
  border-radius: ${(props) => props.theme.borderRadius.large};
`;

const SecondaryButtonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.fonts.colors.primary};
`;




export default function WalletSetup() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const { isEnrolled, biometricsEnabled } = useSelector((state: RootState) => state.biometrics);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);

      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        dispatch(isAuthEnrolled());
        if (!enrolled) {
          Alert.alert(
            'Biometric Record Not Found',
            'Please set up fingerprint or face recognition on your device for enhanced security.',
            [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
          );
        }
      }
    })();
  }, [dispatch]);

  const handleBiometricAuth = async () => {
    const biometricAuth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to create your wallet',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel'
    });
    return biometricAuth.success;
  };

  const walletSetup = async () => {
    setLoading(true);
    try {
      if (isBiometricSupported && isEnrolled) {
        const authResult = await handleBiometricAuth();
        if (!authResult) {
          console.error("Biometric authentication failed");
          setLoading(false);
          return;
        }
      }

      const ethWallet = await ethService.createWallet();
      const masterMnemonicPhrase = ethWallet.mnemonic.phrase;
      const solWallet = await solanaService.restoreWalletFromPhrase(
        masterMnemonicPhrase
      );
      const neoWallet = await neoService.restoreWalletFromPhrase(masterMnemonicPhrase);

      const ethereumAccount: AddressState = {
        accountName: "Account 1",
        derivationPath: `m/44'/60'/0'/0/0`,
        address: ethWallet.address,
        publicKey: ethWallet.publicKey,
        balance: 0,
        transactionMetadata: {
          paginationKey: undefined,
          transactions: [],
        },
        failedNetworkRequest: false,
        status: GeneralStatus.Idle,
        transactionConfirmations: [],
      };

      const solanaAccount: AddressState = {
        accountName: "Account 1",
        derivationPath: `m/44'/501'/0'/0'`,
        address: solWallet.publicKey.toBase58(),
        publicKey: solWallet.publicKey.toBase58(),
        balance: 0,
        transactionMetadata: {
          paginationKey: undefined,
          transactions: [],
        },
        failedNetworkRequest: false,
        status: GeneralStatus.Idle,
        transactionConfirmations: [],
      };
      const neoAccount: AddressState = {
        accountName: "Account 1",
        derivationPath: `m/44'/888'/0'/0'`,
        address: neoWallet.publicKey,
        publicKey: neoWallet.publicKey,
        balance: 0,
        transactionMetadata: {
          paginationKey: undefined,
          transactions: [],
        },
        failedNetworkRequest: false,
        status: GeneralStatus.Idle,
        transactionConfirmations: [],
      };
      dispatch(saveEthereumAddresses([ethereumAccount]));
      dispatch(saveSolanaAddresses([solanaAccount]));
      dispatch(saveNeoAddresses([neoAccount]));


      router.push({
        pathname: ROUTES.seedPhrase,
        params: { phrase: masterMnemonicPhrase },
      });
    } catch (err) {
      console.error("Failed to create wallet", err);
      Alert.alert("Error", "Failed to create wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <SafeAreaContainer>
        <ContentContainer>
          <ImageContainer
            from={{
              translateY: 0,
            }}
            animate={{
              translateY: 50,
            }}
            transition={{
              loop: true,
              type: "timing",
              duration: 2500,
              delay: 100,
            }}
          >
            <ExpoImage
              source={require("../../../assets/images/wallet_alt.png")}
              contentFit="cover"
            />
          </ImageContainer>

          <TextContainer>
            <Title>Get Started with Ease</Title>
            <Subtitle>
              Secure your financial future with a few easy steps. Your
              decentralized wallet awaits.
            </Subtitle>
          </TextContainer>
        </ContentContainer>
        <ButtonContainer>
          {isBiometricSupported && isEnrolled && (
            <Subtitle style={{ marginBottom: 10, textAlign: 'center' }}>
              Fingerprint authentication will be required to set up your wallet.
            </Subtitle>
          )}
          <Button
            linearGradient={theme.colors.secondaryLinearGradient}
            loading={loading}
            disabled={loading}
            onPress={walletSetup}
            title="Create Wallet"
            icon={
              <WalletIcon width={25} height={25} fill={theme.colors.white} />
            }
          />
          <SecondaryButtonContainer
            onPress={() => router.push(ROUTES.walletImportOptions)}
          >
            <SecondaryButtonText>
              Got a wallet? Let's import it
            </SecondaryButtonText>
          </SecondaryButtonContainer>
        </ButtonContainer>
      </SafeAreaContainer>
    </LinearGradientBackground>
  );
}