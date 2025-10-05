import { MatchResults } from "interfaces/interfaces";
import { Modal, Text, View, TouchableOpacity } from "react-native";

type GameResultsModalProps = {
    isVisible: boolean,
    transparent: boolean,
    animationType: "none" | "slide" | "fade" | undefined,
    onClose: () => void,
    gameResultData: MatchResults | undefined
}

export default function GameResultsModal({ 
    isVisible, 
    animationType, 
    transparent, 
    onClose, 
    gameResultData 
}: GameResultsModalProps) {

    const isWinner = gameResultData?.message?.includes('won') ?? false;
    const isDraw = gameResultData?.message?.includes('draw') ?? false;


    return (
        <Modal 
            animationType={animationType} 
            transparent={transparent} 
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/70 px-6">
                <View className="bg-cyan-950 rounded-2xl p-6 w-full max-w-sm border-2 border-cyan-700">
                    
                    <Text className="text-white text-3xl font-bold text-center mb-4">
                        Game Over
                    </Text>

                    <View className={`py-4 px-6 rounded-xl mb-6 ${
                        isWinner ? 'bg-green-900/40' : 
                        isDraw ? 'bg-yellow-900/40' : 
                        'bg-red-900/40'
                    }`}>
                        <Text className={`text-2xl font-bold text-center ${
                            isWinner ? 'text-green-400' : 
                            isDraw ? 'text-yellow-400' : 
                            'text-red-400'
                        }`}>
                            {gameResultData?.message}
                        </Text>
                    </View>

                    {gameResultData?.winner && (
                        <View className="bg-cyan-900 rounded-xl p-4 mb-6">
                            <Text className="text-gray-400 text-sm text-center mb-2">
                                Winner
                            </Text>
                            <Text className="text-white text-xl font-bold text-center">
                                {gameResultData.winner.username}
                            </Text>
                            <Text className="text-cyan-400 text-lg text-center mt-1">
                                ({gameResultData.winner.symbol})
                            </Text>
                        </View>
                    )}

                    {isDraw && (
                        <View className="bg-cyan-900 rounded-xl p-4 mb-6">
                            <Text className="text-gray-400 text-center">
                                No winner this time!
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        className="bg-cyan-600 py-4 rounded-lg active:bg-cyan-700"
                        onPress={onClose}
                    >
                        <Text className="text-white text-lg font-semibold text-center">
                            Back to Home
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
