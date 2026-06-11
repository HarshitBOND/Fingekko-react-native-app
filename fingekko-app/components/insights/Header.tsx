import { Text, TouchableOpacity, View } from 'react-native';

import { s } from './style';

interface Props {
  useDummyData: boolean;
  enableDummy: () => void;
  disableDummy: () => void;
}

export default function Header({
  useDummyData,
  enableDummy,
  disableDummy,
}: Props) {
  return (
    <View style={s.header}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={s.heading}>Insights</Text>

          <Text style={s.subHeading}>
            Understand. Improve. Level up. 🌿
          </Text>
        </View>

        {!useDummyData ? (
          <TouchableOpacity
            onPress={enableDummy}
            style={s.dummyBtn}
          >
            <Text style={s.dummyBtnText}>
              Use dummy data
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={disableDummy}
            style={[s.dummyBtn, s.dummyBtnActive]}
          >
            <Text
              style={[
                s.dummyBtnText,
                { color: '#fff' },
              ]}
            >
              Disable dummy
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}